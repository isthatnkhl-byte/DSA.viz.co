/* eslint-disable @typescript-eslint/no-explicit-any */
export interface ServerFnBuilder<TData = any> {
  middleware: (mw: any[]) => ServerFnBuilder<TData>;
  validator: <TOut = any>(v: (input: any) => TOut) => ServerFnBuilder<TOut>;
  handler: <TReturn = any>(h: (ctx: { data: TData; context?: any }) => Promise<TReturn> | TReturn) => any;
}

export function createServerFn<TData = any>(_options?: any): ServerFnBuilder<TData> {
  let _validator: any = null;
  let _handler: any = null;
  let _middlewares: any[] = [];

  const fnBuilder: any = {
    middleware: (mw: any[]) => {
      _middlewares = mw;
      return fnBuilder;
    },
    validator: (v: any) => {
      _validator = v;
      return fnBuilder;
    },
    handler: (h: any) => {
      _handler = h;
      const callable: any = async (inputArgs?: any) => {
        const payload = inputArgs?.data ?? inputArgs;
        const validated = _validator ? _validator(payload) : payload;
        return await _handler({ data: validated, context: {} });
      };
      callable.handler = _handler;
      return callable;
    },
  };
  return fnBuilder;
}

export function createMiddleware(_options?: any) {
  return {
    server: (fn: (opts: { next: any; handlerType?: any; [key: string]: any }) => any) => {
      return async (opts: any) => {
        return await fn({ ...opts, next: (ctx: any) => ctx });
      };
    },
  };
}

export function createStart(..._args: any[]) {
  return {};
}

export function getRequest() {
  return {
    headers: new Headers(),
  };
}

export function useServerFn(fn: any) {
  return fn;
}

const serverEntry = {
  fetch: async (_req: Request, _env: unknown, _ctx: unknown) => new Response("OK"),
};

export default serverEntry;

