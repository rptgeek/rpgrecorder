# Technology Stack

**Project:** TTRPG Session Recorder and Summarizer
**Researched:** 2024-05-20

## Recommended Stack

### Cloud Provider & Strategy
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| AWS | Latest services | Cloud infrastructure | **Rationale:** AWS offers the broadest and deepest set of services, making it a robust choice for a greenfield project needing scalable AI/ML capabilities, serverless compute, and managed databases. Its ecosystem is mature and well-supported, minimizing operational overhead. We will prioritize **serverless (FaaS)** and **managed services (PaaS)** to maximize scalability, cost-efficiency (pay-per-use), and developer velocity, minimizing IaaS to only when absolutely necessary for specialized components. This approach aligns with modern cloud-native development best practices for AI-powered applications. |

### Core Frameworks
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **Frontend:** Next.js (React) | ^14.x (Latest stable) | Full-stack web application framework | **Rationale:** Next.js provides a powerful foundation for a modern web application, offering server-side rendering (SSR), static site generation (SSG), and API routes out-of-the-box. This enhances performance, SEO (though less critical for a logged-in app, good for landing pages), and developer experience. Its React foundation ensures a large ecosystem and component reusability. |
| **Backend:** Node.js (TypeScript) | ^20.x (LTS) | Serverless function runtime | **Rationale:** Node.js with TypeScript is highly efficient for event-driven, I/O-bound workloads characteristic of serverless functions. TypeScript adds type safety, improving code quality and maintainability. Its rich package ecosystem integrates well with AWS services. |

### Database
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Amazon Aurora (PostgreSQL compatible) | Latest stable | Relational database for structured data | **Rationale:** For core structured data like user accounts, campaign settings, character details, and permissions, Aurora PostgreSQL offers a highly available, scalable, and fully managed relational database. It provides strong ACID compliance and robust querying capabilities, critical for managing interconnected game metadata. |
| Amazon DynamoDB | Latest services | NoSQL database for flexible, high-volume data | **Rationale:** Ideal for storing semi-structured session logs, raw NLP outputs, event streams, and other data with varying schemas or high read/write throughput. As a fully managed, serverless NoSQL database, DynamoDB offers single-digit millisecond performance at any scale, aligning perfectly with the serverless backend. |
| Amazon OpenSearch Service | Latest stable | Search and analytics engine, vector database capabilities | **Rationale:** Essential for powerful keyword search across session summaries, notes, and transcripts. OpenSearch also supports vector embeddings, enabling semantic search capabilities which are crucial for finding relevant content based on meaning, not just keywords, highly beneficial for an AI summarizer. |

### Infrastructure & Services
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Amazon S3 | Latest services | Object storage | **Rationale:** Scalable, durable, and cost-effective storage for raw audio recordings, processed text files, UI assets, and any other static content. Integrates seamlessly with other AWS services like Transcribe and Lambda. |
| AWS Lambda | Latest Node.js 20.x runtime | Serverless compute service | **Rationale:** The backbone of the serverless backend. Lambda functions will handle API requests via API Gateway, process events (e.g., S3 object uploads triggering transcription), and orchestrate AI/ML workflows. Provides automatic scaling and a pay-per-execution cost model. |
| Amazon API Gateway | Latest services | RESTful API endpoint for Lambda | **Rationale:** Manages API requests, routing them to appropriate Lambda functions, handling authentication, and managing rate limiting. It acts as the "front door" for the backend services. |
| AWS Cognito | Latest services | User authentication and authorization | **Rationale:** A fully managed user directory and identity provider service. It simplifies user sign-up, sign-in, and access control, supporting various authentication flows (email/password, social logins) and integrates well with frontend frameworks and API Gateway. |
| AWS CDK (Cloud Development Kit) | ^2.x | Infrastructure as Code (IaC) | **Rationale:** Allows defining AWS infrastructure using familiar programming languages (TypeScript, Python, etc.) rather than YAML/JSON. This improves developer experience, enables code reuse, and integrates IaC into standard software development practices, making infrastructure more manageable and version-controlled. |
| AWS Transcribe | Latest services | Automated Speech-to-Text (STT) | **Rationale:** A highly accurate, managed service for converting audio recordings into text. Crucial for processing TTRPG session audio into searchable and summarizable content. Supports speaker diarization (identifying who spoke when), which is vital for TTRPGs. |
| AWS Comprehend | Latest services | Natural Language Processing (NLP) | **Rationale:** Provides managed NLP services for tasks like entity recognition (characters, places, items), sentiment analysis, and key phrase extraction from session transcripts. This feeds directly into the summarization and insight generation for GMs. |
| OpenAI API / AWS SageMaker | Latest models (e.g., GPT-4o) / Latest services | Advanced summarization and generative AI | **Rationale:** For advanced summarization, tailored player recaps, and complex conversational analysis, leveraging leading LLMs via the OpenAI API (or similar providers) provides state-of-the-art capabilities. For custom model deployment or fine-tuning, AWS SageMaker offers a comprehensive platform, invokable via Lambda. |

### Supporting Libraries
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| **Frontend:** | | | |
| TanStack Query (React Query) | ^5.x | Data fetching, caching, and state management | Essential for efficient data loading, synchronizing server state with UI, and managing complex asynchronous operations in a React application. |
| Tailwind CSS | ^3.x | Utility-first CSS framework | Speeds up UI development with pre-defined utility classes, promoting consistent design and highly customizable styling without writing custom CSS. |
| Zod | ^3.x | Schema validation | Runtime validation for API responses, form inputs, and environmental variables, ensuring data integrity and type safety. |
| **Backend:** | | | |
| Zod | ^3.x | Schema validation | Runtime validation for incoming API payloads and environmental variables in Lambda functions. |
| aws-sdk | ^3.x | AWS services interaction | Official SDK for interacting with all AWS services from Node.js Lambda functions. |

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| **Cloud Provider** | AWS | Google Cloud Platform (GCP), Azure | **Rationale:** While GCP (strong AI/ML) and Azure (enterprise focus) are viable, AWS was chosen for its broader service offering, mature ecosystem, and widespread adoption in the startup community, which often translates to more third-party tools and community support. For a greenfield project aiming for rapid development and extensive AI/ML capabilities, AWS offers a slight edge in breadth and depth. |
| **Frontend Framework** | Next.js (React) | Vue.js (Nuxt.js), Svelte (SvelteKit) | **Rationale:** Vue and Svelte are excellent alternatives, offering different developer experiences. However, React (and Next.js) currently holds the largest market share, leading to a vast ecosystem, more available developers, and abundant learning resources, which is beneficial for a greenfield project. |
| **Backend Runtime** | Node.js (TypeScript) | Python (FastAPI/Flask), Go (Gin/Echo) | **Rationale:** Python is excellent for ML, and Go for raw performance. Node.js with TypeScript was chosen for its strong alignment with web development, good performance for I/O bound serverless workloads, and the advantage of using a single language (JavaScript/TypeScript) across both frontend and backend, simplifying developer context switching. Python can still be used for specific ML-heavy Lambda functions where its ecosystem is superior. |
| **Relational DB** | Amazon Aurora PostgreSQL | MySQL, Amazon RDS | **Rationale:** PostgreSQL is generally preferred over MySQL for its advanced features, extensibility, and better support for complex data types and indexing. Aurora was chosen over standard RDS for its superior scalability, performance, and high availability features specific to AWS. |
| **NoSQL DB** | Amazon DynamoDB | MongoDB Atlas, Google Firestore | **Rationale:** DynamoDB was chosen for its native, fully managed serverless integration within AWS, providing unparalleled scalability and performance for specific access patterns without operational overhead. MongoDB Atlas is a strong contender but would involve managing a separate vendor relationship or running on EC2. Firestore is excellent but is specific to GCP. |
| **Search Engine** | Amazon OpenSearch | Elastic Cloud, Algolia | **Rationale:** OpenSearch offers a fully managed, scalable search solution native to AWS, simplifying integration and management compared to self-hosting Elasticsearch or integrating a third-party service like Algolia (though Algolia has excellent developer experience, OpenSearch's vector capabilities and native integration are a strong draw). |
| **IaC** | AWS CDK | Terraform, AWS CloudFormation | **Rationale:** Terraform is cloud-agnostic and powerful, and CloudFormation is native to AWS (YAML/JSON). AWS CDK was chosen for its developer-friendly approach, allowing infrastructure to be defined in familiar programming languages, which can lead to faster development, easier testing, and better code reuse compared to declarative YAML/JSON configurations. |

## Installation

```bash
# Core Frontend (Next.js)
npm install next react react-dom @tanstack/react-query @tanstack/react-query-devtools zod tailwindcss postcss autoprefixer

# Core Backend (Lambda with TypeScript)
npm install @aws-sdk/client-s3 @aws-sdk/client-transcribe @aws-sdk/client-comprehend @aws-sdk/lib-dynamodb zod
npm install -D typescript @types/node serverless-http # serverless-http for express-like routing

# Infrastructure as Code (AWS CDK)
npm install -g aws-cdk
cdk init app --language typescript
npm install -D ts-node @types/jest @aws-cdk/aws-lambda @aws-cdk/aws-apigateway @aws-cdk/aws-s3 @aws-cdk/aws-dynamodb @aws-cdk/aws-cognito @aws-cdk/aws-opensearchservice @aws-cdk/aws-rds @aws-cdk/aws-iam
```

## Sources

-   Web search for "serverless architecture for AI powered applications 2024", "cloud native stack for audio transcription and NLP 2024", "TTRPG session logging application architecture", "realtime audio processing serverless 2024" (May 20, 2024).
-   AWS official documentation for Lambda, S3, DynamoDB, Aurora, Cognito, Transcribe, Comprehend, OpenSearch, CDK.
-   Next.js official documentation.
-   TanStack Query, Tailwind CSS, Zod official documentation.
-   General industry trends and best practices for modern web and cloud development.
