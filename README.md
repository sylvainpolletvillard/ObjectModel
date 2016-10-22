<p align="center"><a href="http://objectmodel.js.org" target="_blank"><img width="400" src="http://objectmodel.js.org/site/res/logo.png"></a></p>

<p align="center">Strong Dynamically Typed Object Modeling for JavaScript</p>
<p align="center">
  <a href="https://www.npmjs.com/package/objectmodel"><img src="https://img.shields.io/npm/dt/objectmodel.svg" alt="Downloads"></a>
  <a href="https://www.npmjs.com/package/objectmodel"><img src="https://img.shields.io/npm/v/objectmodel.svg" alt="Version"></a>
  <a href="https://www.npmjs.com/package/objectmodel"><img src="https://img.shields.io/npm/l/objectmodel.svg" alt="License"></a>
</p>
---

## What is this library ?
   
   A recurring criticism of JavaScript is that it is a weakly typed language. New languages that compile to JavaScript have been invented, such as [TypeScript](TypeScript) by Microsoft. We also have static analysis tools like [Flow](Flow) by Facebook. These solutions bring static typing, which means it only validate your code at build time, not runtime. *Once compiled in JavaScript and run in the browser, there is no longer any guarantee that the variables you are working with have the intended types*.
   
   *Static typing is insufficient to prevent most of the real and practical bugs caused by type errors*. Indeed, JavaScript applications often involve *unreliable data sources*: user inputs, web services, server-side rendering, browser built-ins, external dependencies, CDN... Static typing can not check the validity of this content since it is retrieved at runtime. For the same reason, developers usually face more type errors with this kind of data compared to their own code that is under their control and can benefit from type inference with their IDE.
   
   This is why Object Model is about **strong dynamic type checking**: it aims to get strong validation constraints for your variables at runtime. Whenever a property is modified, the whole object is validated against its definition. This allows you to identify a problem much more quickly thanks to the generated exceptions. Object Model is also very easy to master: *no new language to learn, no new tools, no compilation step, just a minimalist and intuitive API in a plain old JS micro-library*.
   
   Validating at runtime also brings other benefits : you can define your own types, and use them in complex model definitions with custom assertions and more specific tests that can even change depending on your application state.
   
   Actually it goes much further than just type safety. Go on and see for yourself. 

## Installation
Add the library to your project dependencies with Yarn:
```bash
$ yarn add objectmodel
```
or with NPM:
```bash
$ npm install objectmodel
```

or just [download the library from Github](github-releases)

## Basic usage example

```javascript
var Order = new Model({ // or Model.Object
	product: { name: String, quantity: Number },
	orderDate: Date
});

var myOrder = new Order({
	product: { name: "Apple Pie", quantity: 1 },
	orderDate: new Date()
});

myOrder.product.quantity = 2; // no exceptions thrown
myOrder.product.quantity = false; //try to assign a Boolean
> TypeError: expecting product.quantity to be Number, got Boolean false
```

For more examples, documentation and questions, please refer to the project website: [objectmodel.js.org] [website]

## Release History

Please refer to [Github Releases][github-releases]

## Build, Tests, Contributing

Automatic minifying/concatenating/testing process is done with [Grunt]

After cloning or forking this project, use `yarn` or `npm install` to install development dependencies. To build the library, use `grunt dist` and to run the QUnit tests, use `grunt test`.

*Bug reports and pull requests are welcome.*

Distributed under the MIT license. See ``LICENSE`` for more information.

[website]:http://objectmodel.js.org
[Grunt]:http://gruntjs.com/getting-started
[TypeScript]:https://www.typescriptlang.org/
[Flow]:https://flowtype.org/
[github-releases]:https://github.com/sylvainpolletvillard/ObjectModel/releases