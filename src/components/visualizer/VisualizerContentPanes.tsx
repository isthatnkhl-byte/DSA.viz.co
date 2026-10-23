import React from "react";
import { AiWord } from "@/components/brand/AiWord";
import { Eye, Database, Layers } from "lucide-react";
import type { VizStep } from "@/lib/problems";

interface VisualizerContentPanesProps {
  layoutMode: "stacked" | "grid" | "tabs";
  hasMultipleDatasets: boolean;
  multiDatasetEnabled: boolean;
  activeTab: "primary" | "aux_map" | "aux_buffer" | "aux_list" | "aux_tree" | "aux_array" | "code";
  onSelectTab: (tab: "primary" | "aux_map" | "aux_buffer" | "aux_list" | "aux_tree" | "aux_array" | "code") => void;
  type: string;
  current: VizStep;
  hasAuxMapInTrace: boolean;
  hasAuxSetInTrace: boolean;
  hasAuxStackInTrace: boolean;
  hasAuxQueueInTrace: boolean;
  hasAuxListInTrace: boolean;
  hasAuxTreeInTrace: boolean;
  hasAuxArrayInTrace?: boolean;
  primaryBody: React.ReactNode;
  auxMapComponent: React.ReactNode;
  auxBufferComponent: React.ReactNode;
  auxListComponent: React.ReactNode;
  auxTreeComponent: React.ReactNode;
  auxArrayComponent: React.ReactNode;
}

export function VisualizerContentPanes({
  layoutMode,
  hasMultipleDatasets,
  multiDatasetEnabled,
  activeTab,
  onSelectTab,
  type,
  current,
  hasAuxMapInTrace,
  hasAuxSetInTrace,
  hasAuxStackInTrace,
  hasAuxQueueInTrace,
  hasAuxListInTrace,
  hasAuxTreeInTrace,
  hasAuxArrayInTrace,
  primaryBody,
  auxMapComponent,
  auxBufferComponent,
  auxListComponent,
  auxTreeComponent,
  auxArrayComponent,
}: VisualizerContentPanesProps) {
  if (layoutMode === "tabs" && hasMultipleDatasets && multiDatasetEnabled) {
    return (
      <div className="flex flex-col gap-3">
        {/* Tab Selection Switcher */}
        <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-border/80 bg-card/60 p-1 backdrop-blur-sm">
          <button
            type="button"
            onClick={() => onSelectTab("primary")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-mono text-xs font-semibold transition-all ${
              activeTab === "primary"
                ? "bg-primary text-primary-foreground shadow-xs font-bold"
                : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
            }`}
          >
            <Eye className="size-3.5" />
            <span>Primary ({type.toUpperCase()})</span>
          </button>

          {(hasAuxMapInTrace || hasAuxSetInTrace) && (
            <button
              type="button"
              onClick={() => onSelectTab("aux_map")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-mono text-xs font-semibold transition-all ${
                activeTab === "aux_map"
                  ? "bg-primary text-primary-foreground shadow-xs font-bold"
                  : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
              }`}
            >
              <Database className="size-3.5" />
              <span>Hash Table</span>
              {current.map && Object.keys(current.map).length > 0 && (
                <span className="rounded bg-background/40 px-1 text-[9px]">
                  {Object.keys(current.map).length}
                </span>
              )}
            </button>
          )}

          {(hasAuxStackInTrace || hasAuxQueueInTrace) && (
            <button
              type="button"
              onClick={() => onSelectTab("aux_buffer")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-mono text-xs font-semibold transition-all ${
                activeTab === "aux_buffer"
                  ? "bg-accent text-accent-foreground shadow-xs font-bold"
                  : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
              }`}
            >
              <Layers className="size-3.5" />
              <span>{hasAuxStackInTrace ? "Stack Buffer" : "Queue Buffer"}</span>
            </button>
          )}

          {hasAuxListInTrace && (
            <button
              type="button"
              onClick={() => onSelectTab("aux_list")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-mono text-xs font-semibold transition-all ${
                activeTab === "aux_list"
                  ? "bg-emerald-600 text-white shadow-xs font-bold"
                  : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
              }`}
            >
              <AiWord className="size-3.5" />
              <span>Linked List</span>
            </button>
          )}

          {hasAuxTreeInTrace && (
            <button
              type="button"
              onClick={() => onSelectTab("aux_tree")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-mono text-xs font-semibold transition-all ${
                activeTab === "aux_tree"
                  ? "bg-emerald-600 text-white shadow-xs font-bold"
                  : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
              }`}
            >
              <AiWord className="size-3.5" />
              <span>Aux Tree / Heap</span>
            </button>
          )}

          {hasAuxArrayInTrace && type !== "array" && (
            <button
              type="button"
              onClick={() => onSelectTab("aux_array")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-mono text-xs font-semibold transition-all ${
                activeTab === "aux_array"
                  ? "bg-indigo-600 text-white shadow-xs font-bold"
                  : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
              }`}
            >
              <AiWord className="size-3.5" />
              <span>Input Stream</span>
            </button>
          )}
        </div>

        {/* Active Tab View */}
        <div className="w-full">
          {activeTab === "primary" && primaryBody}
          {activeTab === "aux_map" && auxMapComponent}
          {activeTab === "aux_buffer" && auxBufferComponent}
          {activeTab === "aux_list" && auxListComponent}
          {activeTab === "aux_tree" && auxTreeComponent}
          {activeTab === "aux_array" && auxArrayComponent}
        </div>
      </div>
    );
  }

  /* Stacked or Split-Grid Layout */
  return (
    <div
      className={`flex flex-col gap-4 ${
        layoutMode === "grid" && hasMultipleDatasets && multiDatasetEnabled
          ? "lg:grid lg:grid-cols-12 lg:gap-4"
          : ""
      }`}
    >
      {/* Primary Data Structure View */}
      <div
        className={`${
          layoutMode === "grid" && hasMultipleDatasets && multiDatasetEnabled
            ? "lg:col-span-7 flex flex-col gap-2"
            : "w-full"
        }`}
      >
        {layoutMode === "grid" && hasMultipleDatasets && multiDatasetEnabled && (
          <div className="flex items-center gap-2 px-1 text-[11px] font-mono font-bold uppercase tracking-wider text-muted-foreground">
            <span className="size-2 rounded-full bg-primary shadow-xs shadow-primary" />
            <span>Primary Data Structure ({type.toUpperCase()})</span>
          </div>
        )}
        {primaryBody}
      </div>

      {/* Auxiliary Multi-Dataset Panes */}
      {hasMultipleDatasets && multiDatasetEnabled && (
        <div
          className={`flex flex-col gap-4 ${
            layoutMode === "grid" ? "lg:col-span-5" : "w-full"
          }`}
        >
          {auxMapComponent}
          {auxBufferComponent}
          {auxListComponent}
          {auxTreeComponent}
          {auxArrayComponent}
        </div>
      )}
    </div>
  );
}
