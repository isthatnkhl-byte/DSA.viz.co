/* eslint-disable @typescript-eslint/no-explicit-any */
export function createServerFn(_options?: any) {
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
    server: (fn: any) => {
      return async (opts: any) => {
        return await fn({ ...opts, next: (ctx: any) => ctx });
      };
    },
  };
}

export function getRequest() {
  return {
    headers: new Headers(),
  };
}

export function useServerFn(fn: any) {
  return fn;
}
