import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { NotesBagItem } from "@/lib/notes/types";
import { toast } from "sonner";

interface NotesBagContextType {
  items: NotesBagItem[];
  addItem: (item: Omit<NotesBagItem, "id" | "createdAt">) => NotesBagItem;
  addItems: (items: Array<Omit<NotesBagItem, "id" | "createdAt">>) => NotesBagItem[];
  removeItem: (id: string) => void;
  updateItem: (id: string, updates: Partial<NotesBagItem>) => void;
  clearBag: () => void;
  isDrawerOpen: boolean;
  setIsDrawerOpen: (open: boolean) => void;
  toggleDrawer: () => void;
  selectedItemIds: string[];
  setSelectedItemIds: React.Dispatch<React.SetStateAction<string[]>>;
  toggleSelectItem: (id: string) => void;
  selectAllItems: () => void;
  deselectAllItems: () => void;
}

const NotesBagContext = createContext<NotesBagContextType | undefined>(undefined);

const STORAGE_KEY = "dsaviz:notes_bag";

export const INITIAL_SAMPLE_NOTES: NotesBagItem[] = [
  {
    id: "note_sample_1",
    title: "Binary Search — Logarithmic Invariant Proof",
    sourceType: "VISUALIZER_TRACE",
    createdAt: Date.now() - 3600000,
    tags: ["BinarySearch", "LogN", "MustReview"],
    codeSnippet: `int binarySearch(const std::vector<int>& arr, int target) {
    int low = 0, high = arr.size() - 1;
    while (low <= high) {
        int mid = low + (high - low) / 2;
        if (arr[mid] == target) return mid;
        if (arr[mid] < target) low = mid + 1;
        else high = mid - 1;
    }
    return -1;
}`,
    codeLanguage: "cpp",
    invariantText: "Target value X is strictly guaranteed to reside in [low, high] at iteration start.",
    activePointers: { low: 0, mid: 4, high: 7, target: 9 },
    userNotes: "Always calculate mid using low + (high - low) / 2 to prevent integer overflow in C++ / Java!",
    aiTakeaway: "Halving search space on each step guarantees O(log N) worst-case time complexity.",
  },
  {
    id: "note_sample_2",
    title: "Two Sum — Complement Hash Table Pattern",
    sourceType: "PROBLEM_SOLUTION",
    problemSlug: "two-sum",
    createdAt: Date.now() - 1800000,
    tags: ["Array", "HashTable", "AmazonOA"],
    codeSnippet: `vector<int> twoSum(vector<int>& nums, int target) {
    unordered_map<int, int> seen;
    for (int i = 0; i < nums.size(); ++i) {
        int complement = target - nums[i];
        if (seen.count(complement)) {
            return {seen[complement], i};
        }
        seen[nums[i]] = i;
    }
    return {};
}`,
    codeLanguage: "cpp",
    invariantText: "For index i, seen map contains all elements in nums[0...i-1]. If target - nums[i] in seen, optimal pair resolved.",
    activePointers: { i: 1, complement: 7, target: 9 },
    userNotes: "Single pass O(N) time with O(N) auxiliary space beats O(N^2) brute force nested loops.",
    aiTakeaway: "Trading linear space for instant constant-time lookup is the quintessential DSA interview tradeoff.",
  },
];

export const NotesBagProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<NotesBagItem[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {}
    return INITIAL_SAMPLE_NOTES;
  });

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>(() => items.map((i) => i.id));

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      console.warn("[NotesBag] Could not persist to localStorage:", e);
    }
  }, [items]);

  const addItem = useCallback((itemData: Omit<NotesBagItem, "id" | "createdAt">): NotesBagItem => {
    const newItem: NotesBagItem = {
      ...itemData,
      id: `note_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      createdAt: Date.now(),
    };

    setItems((prev) => [newItem, ...prev]);
    setSelectedItemIds((prev) => [newItem.id, ...prev]);

    toast.success(`Saved "${newItem.title.slice(0, 32)}..." to Notes Bag 🎒`, {
      action: {
        label: "View Notes",
        onClick: () => setIsDrawerOpen(true),
      },
    });

    return newItem;
  }, []);

  const addItems = useCallback((itemsData: Array<Omit<NotesBagItem, "id" | "createdAt">>): NotesBagItem[] => {
    if (!itemsData || itemsData.length === 0) return [];

    const newItems: NotesBagItem[] = itemsData.map((itemData, idx) => ({
      ...itemData,
      id: `note_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 7)}`,
      createdAt: Date.now() + idx,
    }));

    setItems((prev) => [...newItems, ...prev]);
    setSelectedItemIds((prev) => [...newItems.map((n) => n.id), ...prev]);

    toast.success(`Imported ${newItems.length} items to Notes Bag`, {
      action: {
        label: "View Notes",
        onClick: () => setIsDrawerOpen(true),
      },
    });

    return newItems;
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
    setSelectedItemIds((prev) => prev.filter((itemId) => itemId !== id));
    toast.info("Item removed from Notes Bag");
  }, []);

  const updateItem = useCallback((id: string, updates: Partial<NotesBagItem>) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );
  }, []);

  const clearBag = useCallback(() => {
    setItems([]);
    setSelectedItemIds([]);
    toast.info("Notes Bag cleared");
  }, []);

  const toggleDrawer = useCallback(() => {
    setIsDrawerOpen((prev) => !prev);
  }, []);

  const toggleSelectItem = useCallback((id: string) => {
    setSelectedItemIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  }, []);

  const selectAllItems = useCallback(() => {
    setSelectedItemIds(items.map((i) => i.id));
  }, [items]);

  const deselectAllItems = useCallback(() => {
    setSelectedItemIds([]);
  }, []);

  const value = useMemo(
    () => ({
      items,
      addItem,
      addItems,
      removeItem,
      updateItem,
      clearBag,
      isDrawerOpen,
      setIsDrawerOpen,
      toggleDrawer,
      selectedItemIds,
      setSelectedItemIds,
      toggleSelectItem,
      selectAllItems,
      deselectAllItems,
    }),
    [
      items,
      addItem,
      addItems,
      removeItem,
      updateItem,
      clearBag,
      isDrawerOpen,
      toggleDrawer,
      selectedItemIds,
      toggleSelectItem,
      selectAllItems,
      deselectAllItems,
    ]
  );

  return <NotesBagContext.Provider value={value}>{children}</NotesBagContext.Provider>;
};

export function useNotesBag() {
  const context = useContext(NotesBagContext);
  if (!context) {
    throw new Error("useNotesBag must be used within a NotesBagProvider");
  }
  return context;
}
