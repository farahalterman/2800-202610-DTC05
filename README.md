![HideOut Logo](src/assets/Logo.png)

# HideOut  
Hideout is a shade map of Vancouver that focuses on guiding users to areas that are highly shaded and accessible for those with mobility issues. Hideout has been developed with accessibility in mind, and it provides users the ability to leave and read user reviews about shaded areas and their accessibility.

## Hosted website
https://two800-202610-dtc05-jipo.onrender.com/  
Dummy Login: guest@mail.com  
Dummy Password: guest123  


# Technologies Used
- Front-end: Bootstrap
- Back-end: ExpressJS
- Database: Postgres (containerized in Docker for local development)
- API: Leaflet, OpenStreetMap
- Dataset: opendata.vancouver.ca
- AI: Google Gemini is integrated into the smart search 

# Project Structure
```
.  
│   .gitignore  
│   docker-compose.yml  
│   init.sql  
│   Logo.png  
│   package-lock.json  
│   package.json  
│   README.md  
│   sample_data.sql  
│   vite.config.js  
│  
├───documentation  
│       about.html  
│       COMP2800_ERD.drawio.pdf  
│  
├───scss  
│       styles.scss  
│  
├───server  
│       auth.js  
│       authRoutes.js  
│       gemini.js  
│       server.js  
│  
└───src  
    │   Account.html  
    │   home.html  
    │   index.html  
    │   login.html  
    │   main.js  
    │  
    ├───scripts  
    │       navBarElement.js  
    │  
    └───stylesheets  
            style.css  
```

# Installation & Running the Project 

## What you need

### Required Software
- Node.js (v18 or higher recommended)
- npm (comes with Node.js)
- Git
- Docker Desktop (optional: for local database)

### IDEs  
- VSCode or Webstorm

### Database  
- Local Development: PostgreSQL via Docker
- Production: Render PostgreSQL (cloud-hosted)

### APIs and frameworks
  **Note**: All dependencies (APIs and frameworks) will be installed using npm (see [Installing dependencies with npm](#installing-dependencies-with-npm))  
-   "@google/generative-ai": "^0.24.1" - requires key for Gemini integration
-   "@popperjs/core": "^2.11.8"
-   "bcrypt": "^6.0.0"
-   "bootstrap": "^5.3.8"
-   "cors": "^2.8.6"
-   "dotenv": "^17.4.2"
-   "express": "^5.2.1"
-   "jsonwebtoken": "^9.0.3" - requires key
-   "nodemon": "^3.1.14"
-   "pg": "^8.21.0" - Requires key


## Installing dependencies with npm

1. Open the terminal of your project's root directory (These commands work identically in powershell (Windows) or Bash (Unix/Linux))
2. Run ```npm i``` in the terminal
3. And that's it! All dependencies should be downloaded  
    **Note**: Depending on when you run this, there may be newer versions of the dependencies listed above. If you are having problems with this, you can run ```npm update``` to update your dependencies to the latest version


## Running the application locally
1. Open the terminal of your project's root directory (These commands work identically in powershell (Windows) or Bash (Unix/Linux))
2. Run ```docker-compose up``` in the terminal
3. Run ```npm run dev``` in the terminal
4. Click the link in the terminal to open "http://localhost:3000/" in your web browser


# Features
As of May 22nd 2026, this app is still in a developmental stage. There are still some core functionalites that would need to be implemented to bring this app to production

## Curent Features
- Interactive Map with filters for parks and water fountains
- Google Gemini Smart search based on locations in the database
- Account page where one can update or delete their account

## Proposed Features
- More filters for the map, including shade, bus stops, elevation, and noise ratings
- Favorites list. The database queries are already written, but not connected to the favorites page
- Write and display user reviews
- Option to turn off AI feature from settings menu

# Credits, References & Licenses

## Attributions
  **Note**: Claude, Google Gemini, and Chat GPT were all used during the development of the AI smart search feature. Our instructions specifically stated that we did not need to cite the AI assistance to the same level of scrutiny, since the goal was to make a feature entirely with AI. gemini.js was completely generated with AI, and a couple functions in server.js were also generated for this feature
  
- GET request for all locations in the Location table:  
  claude.ai (Sonnet 4.5)
- Create a function and triggers to update overall_rating_avg of a location in the Location table
  claude.ai (Sonnet 4.5)
- Set up a docker compose file to run postgres from Felipe Moura:
  https://github.com/felipewom/docker-compose-postgres
- Array map closest distance calculation adapted from MDN Web Docs:  
  https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/map

## Educational Resources
- BCIT COMP2800: course materials

# License
MIT License
Copyright (c) [2026] [DTC-05]
Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:
[Standard MIT License text]

# About Us

Team Name: DTC-05
Team Members:
- Armin H. (Set E)
- Fara Halterman (Set 2F)
- Declan Shorman (Set 2F)
- Brendan Jang (Set 2F)
