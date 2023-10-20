import React, { Component, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { ABC } from './abc';

export { createStore, compose } from 'redux';
export { applyMiddleware as kindlyApplyMiddleware } from 'redux';

/* eslint-disable no-console */

export async function doSomething() {
  console.log('Inside doSomething()');
  console.log('React version is: ', React.version);
  console.log('typeof React.Component is: ', typeof Component);
  console.log(useMemo);
  const ReactDOM = await import('react-dom');

  console.log('ReactDOM version is: ', ReactDOM.version);
  console.log('A random uuid for you: ', uuidv4());
  console.log('ABC = ', ABC);
  const { PQR } = await import('./pqr');
  console.log('PQR = ', PQR);
}

doSomething();

/* eslint-enable no-console */
