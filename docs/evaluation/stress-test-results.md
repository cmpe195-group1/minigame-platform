## Stress Test Results

### HTTP Baseline

#### Test Configuration
- Tool: Artillery
- Duration: 180 seconds
- Virtual Users: 5,160 total virtual users
- Target: `GET /` and `GET /ping`

#### Results
|        Metric     |   Value  |
|-------------------|----------|
| Avg Response Time | 2 ms     |
| 95th Percentile   | 4 ms     |
| Requests/Second   | 65 req/s |
| Error Rate        | 0%       |

### WebSocket Connection Soak

#### Test Configuration
- Tool: k6
- Duration: 60-second hold
- Virtual Users: 200 concurrent STOMP clients
- Target: `/ws` STOMP connect + subscribe

#### Results
| Metric            | Value                           |
|-------------------|---------------------------------|
| Avg Response Time | 74.82 ms WebSocket connect time |
| 95th Percentile   | 205.61 ms                       |
| Requests/Second   | 3.32 connection opens/sec       |
| Error Rate        | 0%                              |

### Battleship Room Creation

#### Test Configuration
- Tool: k6
- Duration: 200 room creations with concurrency 20
- Virtual Users: 20 concurrent room creators
- Target: `/app/battleship/send` with `create_room`

#### Results
| Metric            | Value                     |
|-------------------|---------------------------|
| Avg Response Time | 27.13 ms                  |
| 95th Percentile   | 187.50 ms                 |
| Requests/Second   | 315.37 room creations/sec |
| Error Rate        | 0%                        |

### Battleship Active Multiplayer

#### Test Configuration
- Tool: k6
- Duration: 120,000 ms active gameplay
- Virtual Users: 80 clients across 20 rooms x 4 players
- Target: `/app/battleship/send` with active `attack_4p` traffic

#### Results
| Metric            | Value                       |
|-------------------|-----------------------------|
| Avg Response Time | 9.17 ms relay latency       |
| 95th Percentile   | 30 ms                       |
| Requests/Second   | 308.59 gameplay actions/sec |
| Error Rate        | 0%                          |

### Sudoku Active Multiplayer

#### Test Configuration
- Tool: k6
- Duration: 180,000 ms active gameplay
- Virtual Users: 32 clients across 8 rooms x 4 players
- Target: `/app/sudoku/create`, `/join`, `/start`, `/makeMove`, and `/newPuzzle`

#### Results
| Metric            | Value                    |
|-------------------|--------------------------|
| Avg Response Time | 175.06 ms update latency |
| 95th Percentile   | 363 ms                   |
| Requests/Second   | 47.30 move updates/sec   |
| Error Rate        | 0%                       |

### Observations

- The backend was stable under all tests, with fast HTTP performance and reliable WebSocket handling
- The main bottleneck is workload complexity in multiplayer game logic
- For optimization, we would optimize real-time message handling, reduce expensive server-side processing during peak multiplayer traffic
