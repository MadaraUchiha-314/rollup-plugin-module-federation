/* eslint-disable import/no-unresolved */
/* 'react' is shared and declared as eager. Hence it will be bundled as part of the remote entry. */
import React, { Component, useMemo } from 'react';
/* 'uuid' is shared. */
import { v4 as uuidv4 } from 'uuid';

/* project-b is another federated remote. button is an exposed module from that federated remote */
import Button, { someThingElse } from 'project-b/button';
/* project-b is another federated remote. link is an exposed module from that federated remote */
import Link, { someThingDifferent } from 'project-b/link';

/* Import from a local file. */
import { ABC } from './abc.js';

/* 'redux' is shared. Example shows that "export" syntax also works */
export { createStore, compose } from 'redux';
export { applyMiddleware as kindlyApplyMiddleware } from 'redux';

/* eslint-disable no-console */

export async function doSomething() {
  console.log('Inside doSomething()');
  console.log('React version is: ', React.version);
  console.log('typeof React.Component is: ', typeof Component);
  console.log(useMemo);
  /* 'react-dom' is shared. */
  const ReactDOM = await import('react-dom');

  console.log('ReactDOM version is: ', ReactDOM.version);
  console.log('A random uuid for you: ', uuidv4());
  console.log('ABC = ', ABC);
  /* './pqr' is an exposed module of this container */
  const { PQR } = await import('./pqr.js');
  console.log('PQR = ', PQR);

  console.log('Button from project-b is: ', Button);
  console.log('someThingElse from project-b is: ', someThingElse());

  console.log('Link from project-b is: ', Link);
  console.log('someThingDifferent from project-b is: ', someThingDifferent());

  return {
    React,
    Component,
    useMemo,
    ReactDOM,
    uuidv4,
    ABC,
    PQR,
    Button,
    someThingElse,
  };
}

/* eslint-enable no-console */
/* eslint-disable import/no-unresolved */
