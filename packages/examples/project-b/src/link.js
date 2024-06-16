import React from 'react';
import axios from 'axios';

const Link = (text) => ({
  link: true,
  text,
});

export const someThingDifferent = () => ({
  something: 'different',
  hi: 'bye',
  React,
  axios,
});

export default Link;
