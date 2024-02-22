const runtimePlugin = () => ({
  name: 'my-runtime-plugin',
  beforeInit(args) {
    // eslint-disable-next-line no-console
    console.log('[ExampleRuntimePlugin]: beforeInit: ', args);
    return args;
  },
  beforeRequest(args) {
    // eslint-disable-next-line no-console
    console.log('[ExampleRuntimePlugin]: beforeRequest: ', args);
    return args;
  },
  afterResolve(args) {
    // eslint-disable-next-line no-console
    console.log('[ExampleRuntimePlugin]: afterResolve', args);
    return args;
  },
  onLoad(args) {
    // eslint-disable-next-line no-console
    console.log('[ExampleRuntimePlugin]: onLoad: ', args);
    return args;
  },
  async loadShare(args) {
    // eslint-disable-next-line no-console
    console.log('[ExampleRuntimePlugin]: loadShare:', args);
  },
  async beforeLoadShare(args) {
    // eslint-disable-next-line no-console
    console.log('[ExampleRuntimePlugin]: beforeloadShare:', args);
    return args;
  },
});

export default runtimePlugin;
