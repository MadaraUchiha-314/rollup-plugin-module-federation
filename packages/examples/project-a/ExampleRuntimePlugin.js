const runtimePlugin = () => {
    return {
      name: 'my-runtime-plugin',
      beforeInit(args) {
        console.log('[ExampleRuntimePlugin]: beforeInit: ', args);
        return args;
      },
      beforeRequest(args) {
        console.log('[ExampleRuntimePlugin]: beforeRequest: ', args);
        return args;
      },
      afterResolve(args) {
        console.log('[ExampleRuntimePlugin]: afterResolve', args);
        return args;
      },
      onLoad(args) {
        console.log('[ExampleRuntimePlugin]: onLoad: ', args);
        return args;
      },
      async loadShare(args) {
        console.log('[ExampleRuntimePlugin]: loadShare:', args);
      },
      async beforeLoadShare(args) {
        console.log('[ExampleRuntimePlugin]: beforeloadShare:', args);
        return args;
      },
    };
};

export default runtimePlugin;