# cesium-threejs-experiment
A small experiment using Three JS on Cesium to emulate a combined scene.
Adapted from code provided by [Wilson Muktar](son_coolz91@hotmail.com).

[Here on github pages](https://analyticalgraphicsinc.github.io/cesium-threejs-experiment/public/).

## Getting Started
Requires Node.js, we recommend version 4.4+. From the root directory, run:
```
npm install
```
This will automatically download Cesium and Threejs, then copy the relevant files
over to `public/Thirdparty`.
Then, run:
```
npm run start
```
or
```
node server.js
```

You should see:
```
restify listening at http://127.0.0.1:8080
```

Navigate to `http://localhost:8080` to view the experiment! You can also use
other ports:
```
node server.js --port=4040
restify listening at http://127.0.0.1:4040
```

Most of the interesting code is in `public/CesiumThree.js`.
To view changes to the demo, just refresh (or cache refresh) your browser.
