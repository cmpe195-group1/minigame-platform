# Mini-Game Platform

> A platform that allows you to play fun browser games with friends 

## Team 34

| Name | GitHub                                       | Email |
|------|----------------------------------------------|-------|
| Huy Mai | [@huynai](https://github.com/huynai)     | huy.mai@sjsu.edu |
| Richard Ngo | [@rng04](https://github.com/rng04)        | richard.t.ngo@sjsu.edu |
| Rishi Raja | [@airsquared](https://github.com/airsquared) | rishi.raja01@sjsu.edu |

**Advisor:** Wencen Wu

---

## Problem Statement

When you want to play games with your friends, it’s hard to quickly find a game to get started and get everyone playing together.

## Solution

A web platform that hosts a library of lightweight browser games. The platform allows singleplayer and multiplayer. 
The games are designed to be easy to pick up and play, with simple controls and a fast learning curve. The platform also includes features for inviting friends, creating game rooms, and chatting with other players.

### Key Features

Included games:
- Trivia
- Uno
- Wordle
- Air Hockey
- Chess
- Checkers
- Battleship
- Sudoku
- Archery

[//]: # (---)

[//]: # (## Demo)

[//]: # ([Link to demo video or GIF])

[//]: # (**Live Demo:** [URL if deployed])

[//]: # (---)

[//]: # (## Screenshots)

[//]: # (| Feature | Screenshot |)
[//]: # (|---------|------------|)
[//]: # (| [Feature 1] | ![Screenshot]&#40;docs/screenshots/feature1.png&#41; |)
[//]: # (| [Feature 2] | ![Screenshot]&#40;docs/screenshots/feature2.png&#41; |)

---

## Tech Stack

| Category    | Technology   |
|-------------|--------------|
| Frontend    | React + Vite |
| Game Engine | Phaser       |
| Backend     | Spring Boot  |
| Database    | PostgreSQL   |
| Deployment  |              |

---

## Getting Started

### Prerequisites

- Java 25
- Node.js 25.4

### Installation

```bash
# Clone the repository
git clone https://github.com/SJSU-CMPE-195/group-project-team-34
cd group-project-team-34

# Install frontend dependencies
cd frontend
npm install

# Install backend dependencies
# Only requires Java 25, no additional setup needed

```

### Running Locally

```bash
# Start backend server
./gradlew bootRun

# Start frontend development server
cd frontend
npm run dev
```

### Running Tests

```bash
./gradlew test
```

---

## API Reference

<details>
<summary>Click to expand API endpoints</summary>


[//]: # (| Method | Endpoint | Auth | Description |)
[//]: # (|--------|----------|------|-------------|)
[//]: # (| .      | .        | .    | .           |)

### API Notes

- **Security:** `SecurityConfiguration` is currently set to allow anonymous access to all requests while JWT resource server support is configured.
- **Interactive docs:** With Springdoc available at runtime (for example via `./gradlew bootRun`), docs are typically served at:
  - `/v3/api-docs`
  - `/swagger-ui/index.html`

</details>

---

## Frontend Routes

| Route           | Component      | Notes                |
|-----------------|----------------|----------------------|
| `/`             | `Home`         | Home page            |
| `/login`        | `LoginPage`    | Login page UI        |
| `/register`     | `RegisterPage` | Registration page UI |
| `/games`        | `Games`        | Game page            |
| `/games/search` | `Search`       | Search page          |

---

## Project Structure

```
.
├── build.gradle
├── settings.gradle
├── src/
│   ├── main/
│   │   └── java/cmpe195/group1/minigameplatform/
│   │       ├── db/
│   │       └── rest/
│   └── test/
└── frontend/
    ├── package.json
    ├── public/game-thumbnails/
    └── src/
        ├── main.tsx
        ├── components/
        ├── games/
        └── pages/
```

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

*CMPE 195A/B - Senior Design Project | San Jose State University | Spring 2026*
