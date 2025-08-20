# AI-Powered Multi-Agent Book Generator

This project is a web-based application that leverages a sophisticated, multi-agent AI system to generate a complete book from a single theme. It provides a robust, configurable, and modular workflow where different AI models can be assigned to specialized roles, ensuring a high-quality and coherent output.

This is a significant refactor of the original proof-of-concept, introducing a resilient and highly customizable generation process.

![screenshot](screenshot.png)

## Features

-   **Multi-Agent System:** The book generation is handled by four distinct AI agents, each with a specific role:
    -   **Planner Agent:** Designs the book's high-level structure, including the chapter list and the paragraph-by-paragraph blueprint.
    -   **Writer Agent:** Generates the text for each paragraph based on the Planner's blueprint and contextual summaries.
    -   **Critic Agent:** Evaluates the generated text against its intended purpose and provides feedback for refinement.
    -   **Summarizer Agent:** Maintains a running summary of the book's content to provide context for future chapters, ensuring consistency.
-   **Configurable AI Provider:** Set the API endpoint for any compatible provider (e.g., OpenRouter, Mistral AI, OpenAI).
-   **Dynamic Model Loading:** Dynamically fetch and display a list of available AI models from your chosen provider.
-   **Resilient Workflow with Fallbacks:** For each agent, configure a primary model and an ordered list of fallback models. If a model fails, the system automatically retries with the next one in the list.
-   **User-Controlled Workflow:** The generation process includes two key "control points," where it pauses and waits for the user to approve the generated chapter list and the final detailed blueprint before proceeding.
-   **Iterative Refinement Loop:** Each paragraph goes through a refinement cycle where it is validated for word count and critiqued for content quality. The Writer agent then refines the text based on the Critic's feedback.
-   **No Local Installation Required:** As a pure HTML, CSS, and JavaScript application, it can be run by simply opening the `index.html` file in a modern web browser. No local server is needed.

## How to Use

1.  **Open the Application:**
    -   Download the project files.
    -   Open the `index.html` file in your web browser (e.g., Chrome, Firefox, Edge).

2.  **Step 1: Configure the API**
    -   In the "1. Configurações Gerais da API" section, enter the **API Endpoint** of your chosen AI provider.
    -   Enter your **API Key** for that provider. This key is used for all API requests and is stored only in your browser session.
    -   Click the **"Carregar Modelos Disponíveis"** button. This will populate the model selection dropdowns in the next section.

3.  **Step 2: Configure the Agents**
    -   In the "2. Configuração dos Agentes de IA" section, you will see a configuration box for each of the four agents.
    -   For each agent, select a **"Modelo Primário"** from the dropdown list.
    -   Optionally, select one or more **"Modelos de Fallback"** from the multi-select box. Hold `Ctrl` (or `Cmd` on Mac) to select multiple models. The system will try them in the order you select them if the primary model fails.

4.  **Step 3: Set Generation Parameters**
    -   In the "3. Parâmetros da Geração do Livro" section:
        -   Enter the **"Tema do Livro"** (Book Theme). This is the core idea for your book.
        -   Set the **"Total de Palavras Alvo"** (Target Word Count).
        -   Define the **"Máximo de Tentativas de Correção"** (Max Correction Retries) for the refinement loop.

5.  **Step 4: Start Generation**
    -   Click the **"Iniciar Geração do Livro"** button.
    -   The process will begin, and you can monitor the progress in the **"Status da Geração"** log.

6.  **Step 5: Approve the Blueprints**
    -   The application will first generate a list of chapters and pause, displaying it in the **"Ponto de Controle"** box. Review the list and click **"Aprovar e Continuar"** if you are satisfied.
    -   Next, it will generate a detailed paragraph-by-paragraph blueprint for the entire book. It will pause again for your final approval. Review the blueprint and click **"Aprovar e Continuar"**.

7.  **Step 6: View and Export**
    -   Once the final blueprint is approved, the system will generate the full book, paragraph by paragraph. You will see the content appear in the **"Conteúdo Gerado"** box in real-time.
    -   When the generation is complete, a success message will appear, and the **"Exportar para TXT"** button will become visible. Click it to download your generated book as a text file.

## Security Note

Your API key is a sensitive credential. This application stores it only in the browser and sends it directly to the AI provider you configure. Do not share a computer or network where others might be able to intercept your key.
