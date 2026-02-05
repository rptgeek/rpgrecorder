# Architecture Patterns

**Domain:** TTRPG Session Recorder and Summarizer
**Researched:** 2024-05-15

## Recommended Architecture

A modern TTRPG session recorder and summarizer system can be designed with a modular, cloud-native approach, leveraging AI for intelligent processing. A key consideration is a "local-first" design to enhance user experience, privacy, and offline capabilities.

The overall architecture can be broken down into three main layers: **Client Applications**, **Core Services (Backend)**, and **Data Storage**.

```mermaid
graph TD
    subgraph Clients
        WEB[Web Application]
        DESKTOP[Desktop Application]
        MOBILE[Mobile Application]
        DISCORD[Discord Bot/Integration]
    end

    subgraph Core Services (Backend)
        A[Audio Ingestion & Processing]
        B[Transcription Service]
        C[AI/NLP Service]
        D[Knowledge Base & Campaign Management]
        E[Synchronization Service]
        F[User Management & Auth]
    end

    subgraph Data Storage
        G[Object Storage (Raw Audio/Logs)]
        H[Relational DB (Metadata, Entities)]
        I[Document DB (Transcripts, Notes)]
        J[Vector DB (Semantic Search)]
        K[Graph DB (Relationships, Lore)]
        L[Local DB (Client-side cache)]
    end

    Clients --> A
    A --> B
    B --> C
    C --> D
    D <--> H
    D <--> J
    D <--> K
    D <--> I
    A --> G
    B --> I
    C --> I
    C --> H
    C --> J
    C --> K
    E <--> D
    E <--> Clients
    F <--> Clients
    F <--> D
    K <--> L
    H <--> L
    I <--> L
```

### Component Boundaries

| Component | Responsibility | Communicates With |
|-----------|----------------|-------------------|
| **Client Applications** | User interface for recording, viewing, and managing sessions; offline capabilities | Core Services (API Gateway), Synchronization Service, User Management |
| **Audio Ingestion & Processing Service** | Receives audio streams/files, handles format conversion, noise reduction, prepares for transcription. | Client Applications, Object Storage, Transcription Service |
| **Transcription Service** | Converts spoken audio to text, performs speaker diarization, provides word-level timestamps. | Audio Ingestion Service, Object Storage (for raw audio), Document DB (for transcripts), AI/NLP Service |
| **AI/Natural Language Processing (NLP) Service** | Extracts entities (characters, locations, items), detects events, performs summarization, relationship extraction, sentiment analysis. | Transcription Service, Knowledge Base Service, Document DB, Relational DB, Vector DB, Graph DB |
| **Knowledge Base & Campaign Management Service** | Stores and manages structured campaign data, entities, relationships, session organization, lore compendium. | AI/NLP Service, User Management, Relational DB, Graph DB, Vector DB |
| **Synchronization Service** | Ensures data consistency across devices and cloud, handles conflict resolution for local-first design. | Client Applications, Knowledge Base Service, Data Storage (Relational DB, Document DB) |
| **User Management & Authentication Service** | Manages user accounts, roles (GM, player), permissions, campaign invitations. | Client Applications, Knowledge Base Service, Relational DB |
| **Object Storage** | Cost-effective, scalable storage for raw audio files, original text logs, and other media. | Audio Ingestion Service, Transcription Service |
| **Relational Database** | Stores structured metadata (e.g., user profiles, campaign settings, core entity attributes, session chronology). | Knowledge Base Service, User Management, AI/NLP Service, Local Databases (via sync) |
| **Document Database** | Stores semi-structured data like raw transcripts, detailed session notes, AI-generated summaries. | Transcription Service, AI/NLP Service, Knowledge Base Service, Local Databases (via sync) |
| **Vector Database** | Enables semantic search and similarity queries on extracted entities and concepts. | AI/NLP Service, Knowledge Base Service |
| **Graph Database** | Represents complex relationships between characters, locations, plot hooks, and other entities for world-building. | AI/NLP Service, Knowledge Base Service |
| **Local Databases** | Client-side persistence for offline functionality and low-latency user experience. | Client Applications, Synchronization Service (syncs with cloud DBs) |

### Data Flow

1.  **Recording & Ingestion:**
    *   User initiates recording via a **Client Application** (Web, Desktop, Mobile, Discord).
    *   Audio stream/file is sent to the **Audio Ingestion & Processing Service**.
    *   Raw audio is optionally stored in **Object Storage**.
2.  **Transcription:**
    *   Processed audio is sent to the **Transcription Service**.
    *   Text transcript with speaker diarization and timestamps is generated.
    *   Raw transcripts are stored in the **Document Database**.
3.  **AI Processing & Extraction:**
    *   Transcripts are fed to the **AI/NLP Service**.
    *   Entities (NPCs, PCs, locations, items), events, and relationships are extracted.
    *   Summaries are generated based on the session content.
    *   Extracted entities and metadata are stored in the **Relational Database**, semantic embeddings in the **Vector Database**, and complex relationships in the **Graph Database**.
    *   Detailed AI-generated summaries and structured notes are stored in the **Document Database**.
4.  **Campaign Management & User Interaction:**
    *   The **Knowledge Base & Campaign Management Service** orchestrates the storage and retrieval of all TTRPG-specific data.
    *   Users interact with this structured data through **Client Applications**, querying, filtering, and navigating campaign lore.
    *   **User Management & Authentication Service** ensures secure access and permission control.
5.  **Synchronization (for Local-First):**
    *   For local-first clients, changes made offline or on different devices are managed by the **Synchronization Service**, which resolves conflicts and ensures data consistency across **Local Databases** and the central cloud **Data Storage**.

## Patterns to Follow

### Pattern 1: Microservices Architecture
**What:** Decompose the application into small, independent services, each running in its own process and communicating via lightweight mechanisms (e.g., APIs, message queues).
**When:** For scalability, maintainability, independent deployment, and leveraging different technologies for different services. Essential for handling varying loads on STT, NLP, and data storage.
**Example:** The distinct services for Audio Ingestion, Transcription, AI/NLP, Knowledge Base, and Synchronization exemplify this.

### Pattern 2: Local-First Design
**What:** Prioritize local data storage and computation on user devices, with cloud services primarily for synchronization, backup, and heavier AI processing.
**When:** To provide offline capabilities, low latency, enhanced data privacy, and a more robust user experience. Crucial for TTRPG sessions which might occur in varied network conditions.
**Example:** Client Applications storing data in Local Databases and using a Synchronization Service with CRDTs to manage cloud sync.

### Pattern 3: Event-Driven Architecture
**What:** Services communicate by producing and consuming events, often via message queues.
**When:** For asynchronous processing, decoupling services, and improving system resilience. Useful for long-running tasks like audio transcription and NLP processing.
**Example:** Audio Ingestion Service publishes an "AudioProcessed" event, which the Transcription Service subscribes to. Transcription Service publishes a "TranscriptReady" event, consumed by the AI/NLP Service.

### Pattern 4: Hybrid Data Storage
**What:** Utilize different types of databases optimized for specific data characteristics.
**When:** To achieve optimal performance, scalability, and flexibility for diverse data types (raw audio, structured metadata, unstructured text, complex relationships).
**Example:** Using Object Storage for raw media, Relational DB for user/campaign metadata, Document DB for transcripts/notes, Vector DB for semantic search, and Graph DB for interconnected lore.

## Anti-Patterns to Avoid

### Anti-Pattern 1: Monolithic AI Processing
**What:** Attempting to perform all AI tasks (STT, entity extraction, summarization) within a single, tightly coupled component or service.
**Why bad:** Creates a single point of failure, difficult to scale individual AI components, leads to vendor lock-in if using a single provider for all tasks, and makes it hard to swap out specific models or services.
**Instead:** Decouple AI functionalities into distinct services (Transcription, AI/NLP) and integrate with various specialized APIs/models.

### Anti-Pattern 2: Centralized Data Silo
**What:** Storing all types of data (raw audio, transcripts, metadata, relationships) in a single database technology.
**Why bad:** Leads to inefficient queries, poor scalability for certain data types (e.g., complex graph traversals in a relational DB), and difficulty in evolving the data model.
**Instead:** Adopt a hybrid data storage approach, using the right database for the right data.

### Anti-Pattern 3: Cloud-Only Dependency
**What:** Designing the system to be entirely dependent on cloud connectivity for all core functionalities.
**Why bad:** Impairs user experience in environments with poor or no internet (common for TTRPGs), introduces higher latency, and raises privacy concerns by always sending sensitive audio data to the cloud.
**Instead:** Implement a local-first design with robust offline capabilities and intelligent synchronization.

## Scalability Considerations

| Concern | At 100 users | At 10K users | At 1M users |
|---------|--------------|--------------|-------------|
| **Audio Processing** | Batch processing for uploaded files, real-time for live streams (small scale). | Distributed audio processing queues (e.g., Kafka/RabbitMQ), autoscaling for transcription/ingestion services. | Highly optimized streaming ingestion, dedicated high-throughput STT providers, potential for edge processing. |
| **AI/NLP Workload** | Single LLM instance per request, basic entity extraction. | Multiple LLM instances, asynchronous processing, caching of common entities/summaries, potential for smaller, specialized models. | Distributed inference with specialized, fine-tuned models, load balancing across multiple LLM providers, efficient context window management. |
| **Data Storage** | Standard SQL/NoSQL databases, direct connections. | Database sharding, read replicas, caching layers (Redis), connection pooling, microservice-specific databases. | Globally distributed databases, advanced caching strategies, data archival, CDN for static content, advanced indexing. |
| **Real-time Sync** | Simple polling/websockets. | WebSockets with message brokers, CRDTs for efficient conflict resolution, sophisticated synchronization protocols. | Global distributed sync clusters, advanced CRDT implementations, potential for peer-to-peer synchronization. |

## Sources

- Web search for "TTRPG session recorder architecture 2024" (Google Web Search, 2024-05-15)
- Web search for "AI TTRPG session summarizer system design 2024" (Google Web Search, 2024-05-15)
- jessmart.in (https://jessmart.in - referenced in search results for local-first design)
- rxdb.info (https://rxdb.info - referenced in search results for local-first design)
- inkandswitch.com (https://www.inkandswitch.com/local-first - referenced in search results for local-first design)
- kleppmann.com (https://martin.kleppmann.com/2020/07/06/local-first-software.html - referenced in search results for local-first design)