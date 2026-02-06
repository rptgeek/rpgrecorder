# Domain Pitfalls

**Domain:** TTRPG Session Recording, Transcription, Summarization, and Insight Generation
**Researched:** 2024-05-20

## Critical Pitfalls

Mistakes that cause rewrites or major issues, directly impacting the core value proposition.

### Pitfall 1: Transcription Accuracy & Speaker Diarization Errors
**What goes wrong:** Poor quality audio leads to unintelligible transcripts, rendering summarization useless. Errors in identifying who spoke when (speaker diarization) confuse context and make summaries inaccurate.
**Why it happens:** Background noise, overlapping speech, multiple speakers, varying accents, low-quality microphones, and the use of domain-specific terminology (fantasy names, spells, jargon) that STT models aren't trained on.
**Consequences:** Frustrated Game Masters (GMs) unable to use the transcripts or summaries effectively. The product is perceived as unreliable and not providing its core promised value. Manual correction becomes too burdensome.
**Prevention:**
-   **User Guidance:** Clear instructions for users on how to capture good quality audio.
-   **Robust STT Service:** Leverage highly accurate services like AWS Transcribe, which offers custom vocabularies and speaker diarization.
-   **Custom Vocabulary:** Build and maintain a custom vocabulary for common TTRPG terms, character names, and locations.
-   **Post-Transcription Editing:** Provide tools for GMs to manually correct transcripts and speaker labels.
-   **Error Handling:** Design the pipeline to handle and flag transcription failures or low-confidence segments.
**Detection:** Automated quality checks (e.g., confidence scores from STT), dedicated user feedback channels, manual review of samples.

### Pitfall 2: AI Summarization Quality, Relevance, and Hallucination
**What goes wrong:** Summaries are generic, miss crucial plot points, or actively fabricate information (hallucinate). Player recaps are irrelevant or misrepresent their actions. The AI fails to extract meaningful insights for GMs.
**Why it happens:** Over-reliance on generic Large Language Models (LLMs) without domain-specific prompt engineering or fine-tuning. Difficulty distinguishing critical narrative elements from incidental chatter. Lack of context or "memory" across sessions.
**Consequences:** Loss of trust in the AI, product provides little to no actual value, GMs revert to manual note-taking, rendering the AI features obsolete.
**Prevention:**
-   **Focused Prompt Engineering:** Develop and iterate on highly specific prompts for LLMs, guiding them to focus on TTRPG narrative elements (plot, character arcs, decisions, combat outcomes).
-   **Hybrid Approach:** Combine LLM summarization with structured entity extraction (via AWS Comprehend or custom NER) to ensure key facts are included.
-   **Extractive vs. Abstractive:** Prioritize extractive summarization initially to reduce hallucination, gradually introducing abstractive methods with robust validation.
-   **Contextualization:** Implement mechanisms to provide LLMs with relevant context (e.g., previous session summaries, character sheets, campaign notes).
-   **Feedback Loop:** Allow GMs to provide feedback on summary quality, which can be used to refine prompts or models.
**Detection:** User feedback, human evaluation metrics (e.g., ROUGE scores if reference summaries are available), monitoring for factual consistency.

### Pitfall 3: Data Privacy & Security (Sensitive Game/Player Data)
**What goes wrong:** Sensitive player discussions, personal notes, or campaign secrets are exposed due to inadequate security measures. Unauthorized access or data breaches occur.
**Why it happens:** Insufficient access controls (IAM), unencrypted data storage (at rest/in transit), insecure API endpoints, lack of robust authentication/authorization, lax data retention/deletion policies.
**Consequences:** Severe reputational damage, user exodus, potential legal repercussions, and privacy violations. Erodes user trust completely.
**Prevention:**
-   **Encryption Everywhere:** Encrypt all data at rest (S3, DynamoDB, Aurora, OpenSearch) and in transit (TLS for all communication).
-   **Principle of Least Privilege:** Strictly define IAM roles and policies, granting only the minimum necessary permissions to each service and user.
-   **Secure API Gateway:** Configure API Gateway with proper authentication (Cognito), authorization (Lambda authorizers), and WAF.
-   **Cognito User Pools:** Use AWS Cognito for robust, managed user authentication and authorization.
-   **Data Retention Policies:** Implement clear, transparent, and enforceable policies for data retention and deletion, allowing users control over their data.
-   **Regular Security Audits:** Conduct frequent security reviews, penetration testing, and vulnerability assessments.
**Detection:** Security Information and Event Management (SIEM) systems, AWS Security Hub, regular compliance checks.

## Moderate Pitfalls

Mistakes that cause delays, increased costs, or technical debt if not addressed.

### Pitfall 1: Cloud Cost Overruns
**What goes wrong:** Uncontrolled or unoptimized usage of cloud resources (Lambda invocations, AI service API calls, data storage) leads to unexpectedly high monthly bills.
**Why it happens:** Inefficient Lambda function design (e.g., high memory/CPU allocated unnecessarily), unoptimized AI service calls (e.g., re-transcribing same audio), excessive logging, unmanaged storage growth, lack of cost monitoring.
**Consequences:** Unsustainable business model, budget exhaustion, forced reduction of features.
**Prevention:**
-   **Budget Alerts:** Set up AWS Budgets with alerts for exceeding thresholds.
-   **Cost Monitoring Tools:** Regularly review AWS Cost Explorer and detailed billing reports.
-   **Lambda Optimization:** Optimize Lambda memory/CPU allocation, minimize cold starts, use provisioned concurrency judiciously for critical paths.
-   **AI API Optimization:** Cache AI results where appropriate, implement smart retry logic, manage LLM token usage (e.g., context window optimization).
-   **Storage Lifecycle Policies:** Implement S3 lifecycle policies to move older data to cheaper storage tiers or delete it after a set period.
**Detection:** Proactive monitoring of AWS billing, review of service usage metrics (Lambda invocations, Transcribe/Comprehend minutes).

### Pitfall 2: Serverless Cold Starts & Latency
**What goes wrong:** Infrequently used Lambda functions experience noticeable delays (cold starts) during their initial invocation, leading to a sluggish user experience.
**Why it happens:** Lambda containers are spun up on demand. If a function hasn't been invoked recently, the first call might incur the overhead of environment initialization.
**Consequences:** Perceived slowness, especially for API endpoints that aren't constantly in use.
**Prevention:**
-   **Provisioned Concurrency:** Use AWS Lambda Provisioned Concurrency for critical, user-facing Lambda functions to keep them initialized.
-   **Warm-up Strategies:** Implement periodic, scheduled invocations for less critical functions to keep them "warm."
-   **Code Optimization:** Minimize Lambda deployment package size and cold start duration by optimizing dependencies and runtime.
-   **API Gateway Caching:** Cache responses for frequently accessed but static data.
**Detection:** Monitoring API response times via AWS CloudWatch metrics, tracking Lambda cold start rates.

## Minor Pitfalls

Mistakes that cause annoyance but are generally fixable without major disruption.

### Pitfall 1: Large Audio File Upload Failures
**What goes wrong:** Users experience failed or extremely slow uploads of long TTRPG session recordings, leading to frustration.
**Why it happens:** Unstable internet connections, very large file sizes pushing network limits, browser limitations, or client-side errors.
**Consequences:** User frustration, loss of recorded data, incomplete sessions.
**Prevention:**
-   **Pre-signed S3 URLs:** Allow direct, secure client-side uploads to S3, bypassing the backend server entirely for the actual file transfer.
-   **Client-Side Chunking/Resumable Uploads:** Implement mechanisms in the frontend to split large files into smaller chunks and allow uploads to resume after interruptions.
-   **Clear UI Feedback:** Provide clear progress indicators and error messages during uploads.
-   **Robust Retry Mechanisms:** Implement automatic retries for failed chunks.
**Detection:** Error logging on upload attempts, user reports.

### Pitfall 2: Schema Evolution for NoSQL (DynamoDB)
**What goes wrong:** As the application evolves, changes to the semi-structured data stored in DynamoDB become difficult to manage, leading to data inconsistencies or broken queries.
**Why it happens:** Lack of foresight in data modeling, ad-hoc changes to item attributes, absence of clear versioning for data schemas.
**Consequences:** Data corruption, application errors, increased development time to manage legacy data.
**Prevention:**
-   **Clear Access Patterns:** Design DynamoDB tables around access patterns, understanding how data will be read and written.
-   **Data Validation:** Implement robust data validation (e.g., using Zod) in Lambda functions before writing to DynamoDB.
-   **Defensive Programming:** Write code that is resilient to missing or unexpected attributes.
-   **Data Versioning:** Consider adding a 'version' attribute to items to manage schema changes, allowing for transformation logic in application code.
-   **Migration Scripts:** Plan for and build migration scripts to update existing data if schema changes are unavoidable.
**Detection:** Automated tests that check data integrity, vigilant monitoring of application errors, database queries returning unexpected results.

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| **Transcription Pipeline (Phase 1)** | Underestimating impact of poor audio quality on STT. | Implement strict audio quality checks at upload, provide user guides for recording, prioritize speaker diarization. |
| **Foundational AI (Phase 2)** | Generic or hallucinating summaries providing no value. | Intensive prompt engineering, A/B testing of different LLM configurations, human-in-the-loop validation, starting with extractive summaries. |
| **Search Implementation (Phase 3)** | Suboptimal search results (irrelevant keyword or semantic matches). | Thorough testing of OpenSearch indexing strategies, fine-tuning relevance scoring, iterative improvement based on user feedback. |
| **Cost Management (Throughout)** | Uncontrolled cloud spend on AI services. | Establish clear budget alerts early, implement caching strategies, monitor API calls closely, optimize Lambda memory/CPU. |

## Sources

-   AWS Well-Architected Framework (Cost Optimization, Reliability, Security pillars).
-   Industry articles and best practices for serverless and AI/ML application development.
-   Common pitfalls documented in post-mortems and community discussions for similar cloud-native projects.