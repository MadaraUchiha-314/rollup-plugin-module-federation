import React, { Component, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
/* eslint-disable-next-line import/no-unresolved */
import Button, { someThingElse } from 'project-b/Button';
import { ABC } from './abc.js';

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
  const { PQR } = await import('./pqr.js');
  console.log('PQR = ', PQR);

  console.log('Button from project-b is: ', Button);
  console.log('someThingElse from project-b is: ', someThingElse())

  return {
    React,
    Component,
    useMemo,
    ReactDOM,
    uuidv4,
    ABC,
    PQR,
  };
}

/* eslint-enable no-console */
