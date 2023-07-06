import React from 'react';
import ReactDOM from 'react-dom';
import { v4 as uuidv4 } from 'uuid';

export function doSomething() {
  console.log("Inside doSomething()");
  console.log(React);
  console.log(ReactDOM);
  console.log(uuidv4);
}
