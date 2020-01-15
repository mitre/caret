# Welcome to CARET

The Cyber Analytic Repository Exploration Tool (CARET) is a proof-of-concept graphical user interface designed to connect the groups and techniques highlighted in [ATT&CK](https://attack.mitre.org)® to the analytics, data model, and sensors highlighted in MITRE's [Cyber Analytics Repository](https://car.mitre.org) (CAR).
CARET is used to develop an understanding of defensive capabilities and to aid in their development and use. 
Additional information explaining CARET and the types of questions it helps solve can be found at <https://mitre.github.io/unfetter/about>.  


## To get started:
 1. Clone this repository
 2. Download and install [node.js](https://nodejs.org/en/)
 3. In an elevated command, prompt run `npm install -g gulp bower`
 4. In the caret/ directory, run `npm install`
 4. In the caret/ directory, run `bower install`
 5. To start the development server, run `gulp serve`
 
## Assorted features:
 - To create a minified distributable suitable for running on a standard webserver:
   - Modify the host URL for CAR to the appropriate location of the CAR instance to which you will deploy (e.g., in grid.controller.js and test.controller.js)
   - Run `gulp build`
   - The distributable is in the dist/ directory
   
   ***
   ATT&CK is a trademark of The MITRE Corporation.
   
   Approved for Public Release; Distribution Unlimited. 16-2823

   Copyright 2020 The MITRE Corporation. ALL RIGHTS RESERVED.
