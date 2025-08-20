document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    // Section 1: General Settings
    const apiEndpointInput = document.getElementById('api-endpoint');
    const apiKeyInput = document.getElementById('api-key');
    const fetchModelsBtn = document.getElementById('fetch-models-btn');

    // Section 2: Agent Configuration
    const agentSelects = {
        planner: {
            primaryInput: document.getElementById('planner-primary-input'),
            primaryValue: document.getElementById('planner-primary-value'),
            primaryDropdown: document.getElementById('planner-primary-dropdown'),
            fallbackInput: document.getElementById('planner-fallback-input'),
            fallbackValue: document.getElementById('planner-fallback-value'),
            fallbackDropdown: document.getElementById('planner-fallback-dropdown'),
            fallbackTags: document.getElementById('planner-fallback-selected-tags')
        },
        writer: {
            primaryInput: document.getElementById('writer-primary-input'),
            primaryValue: document.getElementById('writer-primary-value'),
            primaryDropdown: document.getElementById('writer-primary-dropdown'),
            fallbackInput: document.getElementById('writer-fallback-input'),
            fallbackValue: document.getElementById('writer-fallback-value'),
            fallbackDropdown: document.getElementById('writer-fallback-dropdown'),
            fallbackTags: document.getElementById('writer-fallback-selected-tags')
        },
        critic: {
            primaryInput: document.getElementById('critic-primary-input'),
            primaryValue: document.getElementById('critic-primary-value'),
            primaryDropdown: document.getElementById('critic-primary-dropdown'),
            fallbackInput: document.getElementById('critic-fallback-input'),
            fallbackValue: document.getElementById('critic-fallback-value'),
            fallbackDropdown: document.getElementById('critic-fallback-dropdown'),
            fallbackTags: document.getElementById('critic-fallback-selected-tags')
        },
        summarizer: {
            primaryInput: document.getElementById('summarizer-primary-input'),
            primaryValue: document.getElementById('summarizer-primary-value'),
            primaryDropdown: document.getElementById('summarizer-primary-dropdown'),
            fallbackInput: document.getElementById('summarizer-fallback-input'),
            fallbackValue: document.getElementById('summarizer-fallback-value'),
            fallbackDropdown: document.getElementById('summarizer-fallback-dropdown'),
            fallbackTags: document.getElementById('summarizer-fallback-selected-tags')
        }
    };

    // Section 3: Generation Parameters
    const bookThemeInput = document.getElementById('book-theme');
    const targetWordCountInput = document.getElementById('target-word-count');
    const maxRetriesInput = document.getElementById('max-retries');

    // Section 4: Controls and Visualization
    const startGenerationBtn = document.getElementById('start-generation-btn');
    const statusLog = document.getElementById('status-log');
    const approvalContainer = document.getElementById('approval-container');
    const approvalContent = document.getElementById('approval-content');
    const approveBtn = document.getElementById('approve-btn');
    const rejectBtn = document.getElementById('reject-btn');
    const bookOutput = document.getElementById('book-output');
    const exportBtn = document.getElementById('export-btn');

    // --- Helper Functions ---
    function logStatus(message, type = 'info') {
        const timestamp = new Date().toLocaleTimeString();
        const color = type === 'error' ? 'text-danger' : (type === 'success' ? 'text-success' : 'text-info');
        statusLog.innerHTML += `<p class="${color}">[${timestamp}] ${message}</p>`;
        statusLog.scrollTop = statusLog.scrollHeight; // Auto-scroll
    }

    // --- Core Logic ---

    /**
     * Fetches available models from the provider and populates the select dropdowns.
     */
    async function fetchModels() {
        const endpoint = apiEndpointInput.value;
        const apiKey = apiKeyInput.value;

        if (!endpoint || !apiKey) {
            logStatus('Por favor, insira o Endpoint da API e a Chave da API.', 'error');
            return;
        }

        logStatus('Buscando modelos disponíveis...');
        fetchModelsBtn.disabled = true;

        try {
            const response = await fetch(`${endpoint}/models`, {
                headers: {
                    'Authorization': `Bearer ${apiKey}`
                }
            });

            if (!response.ok) {
                throw new Error(`Falha na requisição à API: ${response.statusText}`);
            }

            const data = await response.json();
            const models = data.data || []; // Adjust based on actual API response structure

            if (models.length === 0) {
                logStatus('Nenhum modelo encontrado. Verifique o endpoint e a chave, ou a estrutura da resposta da API.', 'error');
                return;
            }

            const modelIds = models.map(model => model.id).filter(id => id);

            Object.values(agentSelects).forEach(agent => {
                setupComboBox(agent.primaryInput, agent.primaryValue, agent.primaryDropdown, modelIds);
                setupMultiComboBox(agent.fallbackInput, agent.fallbackValue, agent.fallbackDropdown, agent.fallbackTags, modelIds);
            });

            logStatus(`Carregados ${models.length} modelos com sucesso.`, 'success');

        } catch (error) {
            logStatus(`Erro ao buscar modelos: ${error.message}`, 'error');
        } finally {
            fetchModelsBtn.disabled = false;
        }
    }

    /**
     * Executes a call to the LLM provider with a given agent's configuration.
     * It tries the primary model first, then iterates through fallbacks on failure.
     * @param {object} agentConfig - The configuration for the agent.
     * @param {string} prompt - The prompt to send to the model.
     * @param {string} systemMessage - The system message to set the context for the model.
     * @returns {Promise<string>} The content of the response.
     */
    async function executeAgent(agentConfig, prompt, systemMessage = 'Você é um assistente de IA prestativo.') {
        const endpoint = apiEndpointInput.value;
        const apiKey = apiKeyInput.value;
        const modelsToTry = [agentConfig.primary, ...(agentConfig.fallback || [])];

        for (const model of modelsToTry) {
            if (!model) continue; // Skip if model is not selected

            logStatus(`Tentando o modelo: ${model}...`);
            try {
                const response = await fetch(`${endpoint}/chat/completions`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        model: model,
                        messages: [
                            { role: 'system', content: systemMessage },
                            { role: 'user', content: prompt }
                        ]
                    })
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({})); // try to get more error info
                    const errorMessage = errorData.error?.message || response.statusText;
                    throw new Error(`Falha na API com o modelo ${model}: ${errorMessage}`);
                }

                const data = await response.json();
                const content = data.choices[0]?.message?.content;

                if (!content) {
                    throw new Error(`Resposta vazia do modelo ${model}.`);
                }

                logStatus(`Sucesso com o modelo: ${model}.`, 'success');
                return content;

            } catch (error) {
                logStatus(`Erro com o modelo ${model}: ${error.message}. Tentando o próximo...`, 'error');
            }
        }

        throw new Error('Todos os modelos (primário e de fallback) falharam.');
    }

    /**
     * Main function to start the book generation workflow.
     */
    async function startGeneration() {
        logStatus('Iniciando o processo de geração do livro...');
        startGenerationBtn.disabled = true;
        bookOutput.innerHTML = ''; // Clear previous output

        try {
            // 1. Get all settings from the UI
            const settings = {
                apiKey: apiKeyInput.value,
                apiEndpoint: apiEndpointInput.value,
                bookTheme: bookThemeInput.value,
                targetWordCount: parseInt(targetWordCountInput.value, 10),
                maxRetries: parseInt(maxRetriesInput.value, 10),
                agents: {
                    planner: {
                        primary: agentSelects.planner.primaryValue.value,
                        fallback: JSON.parse(agentSelects.planner.fallbackValue.value || '[]')
                    },
                    writer: {
                        primary: agentSelects.writer.primaryValue.value,
                        fallback: JSON.parse(agentSelects.writer.fallbackValue.value || '[]')
                    },
                    critic: {
                        primary: agentSelects.critic.primaryValue.value,
                        fallback: JSON.parse(agentSelects.critic.fallbackValue.value || '[]')
                    },
                    summarizer: {
                        primary: agentSelects.summarizer.primaryValue.value,
                        fallback: JSON.parse(agentSelects.summarizer.fallbackValue.value || '[]')
                    }
                }
            };

            // Basic validation
            if (!settings.apiKey || !settings.apiEndpoint || !settings.bookTheme) {
                logStatus('Por favor, preencha todas as configurações e parâmetros antes de iniciar.', 'error');
                throw new Error("Configurações faltando.");
            }

            // 2. Phase 1: Planning
            const blueprint = await phase1_planning(settings);
            if (!blueprint) {
                logStatus("Planejamento cancelado ou falhou. A geração foi interrompida.", 'error');
                return;
            }

            // 3. Phase 2 & 3: Generation and Consolidation
            const fullBookContent = await phase2_3_generation_and_consolidation(settings, blueprint);

            // 4. Phase 4: Conclusion
            phase4_conclusion(fullBookContent);

        } catch (error) {
            logStatus(`Ocorreu um erro na geração: ${error.message}`, 'error');
        } finally {
            startGenerationBtn.disabled = false;
            approvalContainer.style.display = 'none';
        }
    }

    /**
     * Handles the user approval flow.
     * @param {string} title - The title to display in the approval box.
     * @param {string} content - The content that needs approval (e.g., chapter list).
     * @returns {Promise<boolean>} - Resolves with true if approved, false if rejected.
     */
    function waitForApproval(title, content) {
        return new Promise((resolve) => {
            approvalContainer.style.display = 'block';
            approvalContent.innerHTML = `<h6>${title}</h6><pre>${content}</pre>`;

            approveBtn.onclick = () => {
                approvalContainer.style.display = 'none';
                resolve(true);
            };
            rejectBtn.onclick = () => {
                approvalContainer.style.display = 'none';
                resolve(false);
            };
        });
    }

    /**
     * Phase 1: Generate the book's blueprint.
     * @param {object} settings - The generation settings.
     * @returns {Promise<object|null>} The complete blueprint or null if cancelled.
     */
    async function phase1_planning(settings) {
        // Step 1: Generate Chapter List
        logStatus("Fase 1: Gerando a lista de capítulos...");
        const chapterListPrompt = `Gere uma lista estruturada de tópicos de capítulos para um livro com o tema "${settings.bookTheme}". O livro deve ter aproximadamente ${settings.targetWordCount} palavras. Retorne apenas a lista, um capítulo por linha, sem numeração ou texto introdutório.`;
        const chapterListStr = await executeAgent(settings.agents.planner, chapterListPrompt, 'Você é um arquiteto de conteúdo experiente, especializado em estruturar livros.');

        const chapters = chapterListStr.split('\n').filter(c => c.trim() !== '');
        logStatus("Lista de capítulos gerada. Aguardando aprovação do usuário...", "info");

        // Step 2: Get user approval for the chapter list
        const isChapterListApproved = await waitForApproval("Aprovar Lista de Capítulos?", chapters.join('\n'));
        if (!isChapterListApproved) {
            return null;
        }
        logStatus("Lista de capítulos aprovada.", "success");

        // Step 3: Generate Paragraph Blueprint for each chapter
        logStatus("Gerando o blueprint de parágrafos para cada capítulo...");
        const fullBlueprint = [];
        for (const chapterTitle of chapters) {
            logStatus(`Gerando blueprint para o capítulo: "${chapterTitle}"`);
            const paragraphPrompt = `Para o capítulo "${chapterTitle}", crie um "Blueprint de Parágrafos". Este blueprint deve ser uma lista de ideias centrais, onde cada ideia representa um parágrafo. Para cada item, defina 'ideia_central' e 'palavras_alvo'. O formato deve ser JSON. Exemplo: [{"ideia_central": "Introdução ao conceito X.", "palavras_alvo": 100}, {"ideia_central": "Desenvolvimento do impacto de X.", "palavras_alvo": 150}]`;
            const paragraphBlueprintStr = await executeAgent(settings.agents.planner, paragraphPrompt, 'Você é um arquiteto de conteúdo que detalha a estrutura de cada capítulo em parágrafos.');

            try {
                const paragraphBlueprints = JSON.parse(paragraphBlueprintStr);
                fullBlueprint.push({ chapter: chapterTitle, paragraphs: paragraphBlueprints });
            } catch (e) {
                logStatus(`Erro ao processar o blueprint do capítulo "${chapterTitle}". Pulando.`, 'error');
            }
        }

        // Step 4: Get final approval for the full blueprint
        const formattedBlueprint = fullBlueprint.map(chap =>
            `Capítulo: ${chap.chapter}\n` +
            chap.paragraphs.map(p => `  - ${p.ideia_central} (${p.palavras_alvo} palavras)`).join('\n')
        ).join('\n\n');

        logStatus("Blueprint completo gerado. Aguardando aprovação final...", "info");
        const isBlueprintApproved = await waitForApproval("Aprovar Blueprint Completo do Livro?", formattedBlueprint);

        return isBlueprintApproved ? fullBlueprint : null;
    }

    /**
     * Phase 2 & 3: Generation and Consolidation loop.
     * @param {object} settings - The generation settings.
     * @param {object} blueprint - The approved blueprint.
     * @returns {Promise<string>} The full content of the book.
     */
    async function phase2_3_generation_and_consolidation(settings, blueprint) {
        let fullBookContent = '';
        let contextualSummary = `Resumo inicial do livro com o tema: ${settings.bookTheme}`;

        for (const chapter of blueprint) {
            logStatus(`Iniciando Capítulo: ${chapter.chapter}`, 'info');
            let chapterContent = `<h2>${chapter.chapter}</h2>\n`;

            for (const paragraph of chapter.paragraphs) {
                logStatus(`Gerando parágrafo: "${paragraph.ideia_central}"`);

let currentText = '';
let approved = false;

// Initial generation
logStatus(`Gerando rascunho inicial para o parágrafo: "${paragraph.ideia_central}"`);
const initialWriterPrompt = `Gere um parágrafo com cerca de ${paragraph.palavras_alvo} palavras sobre a seguinte ideia: "${paragraph.ideia_central}". Contexto atual do livro: "${contextualSummary}"`;
currentText = await executeAgent(settings.agents.writer, initialWriterPrompt, 'Você é um escritor de ficção/não-ficção criativo e eloquente.');

for (let i = 0; i < settings.maxRetries; i++) {
    logStatus(`Tentativa de refinamento ${i + 1}/${settings.maxRetries} para o parágrafo.`);

    // 1. Validate Size
    const wordCount = getWordCount(currentText);
    const tolerance = 0.25; // 25% tolerance
    if (wordCount < paragraph.palavras_alvo * (1 - tolerance) || wordCount > paragraph.palavras_alvo * (1 + tolerance)) {
        logStatus(`Contagem de palavras (${wordCount}) fora da meta (${paragraph.palavras_alvo}). Refinando tamanho...`, 'info');
        const sizeCorrectionPrompt = `O texto a seguir está com a contagem de palavras incorreta. A meta é ${paragraph.palavras_alvo}, mas o texto tem ${wordCount}. Por favor, reescreva-o para atingir a meta. Texto: "${currentText}"`;
        currentText = await executeAgent(settings.agents.writer, sizeCorrectionPrompt, 'Você é um editor conciso.');
        continue; // Re-evaluate the new text in the next loop iteration
    }

    // 2. Validate Content
    const criticPrompt = `Avalie se o parágrafo a seguir cumpre efetivamente a sua ideia central. Ideia Central: "${paragraph.ideia_central}". Parágrafo: "${currentText}". Se cumprir, responda apenas "OK". Se não, forneça um feedback conciso e acionável para o escritor melhorar o texto.`;
    const feedback = await executeAgent(settings.agents.critic, criticPrompt, 'Você é um crítico literário rigoroso, focado em clareza, coesão e relevância.');

    if (feedback.trim().toUpperCase() === 'OK') {
        logStatus('Parágrafo aprovado pelo crítico.', 'success');
        approved = true;
        break; // Exit refinement loop, paragraph is good
    } else {
        logStatus(`Crítico solicitou revisão: "${feedback}". Refinando conteúdo...`, 'info');
        const contentCorrectionPrompt = `O crítico deu o seguinte feedback sobre o parágrafo: "${feedback}". Reescreva o parágrafo para incorporar o feedback. Parágrafo original: "${currentText}"`;
        currentText = await executeAgent(settings.agents.writer, contentCorrectionPrompt, 'Você é um escritor que aprimora textos com base em críticas.');
        // No continue here, it will naturally go to the next iteration of the 'for' loop to re-evaluate both size and content if needed.
    }
}

                if (approved) {
                    chapterContent += `<p>${currentText}</p>\n`;
                    bookOutput.innerHTML += `<p>${currentText}</p>\n`; // Append paragraph to live output
                } else {
                    logStatus(`Falha ao aprovar o parágrafo "${paragraph.ideia_central}" após ${settings.maxRetries} tentativas. Pulando.`, 'error');
                }
            }

            fullBookContent += chapterContent;

            // Phase 3: Update contextual summary at the end of the chapter
            logStatus(`Consolidando o resumo do capítulo: ${chapter.chapter}`);
            const summarizerPrompt = `O resumo contextual atual é: "${contextualSummary}". O novo capítulo gerado é: "${chapterContent}". Crie um novo resumo detalhado que incorpore as informações do novo capítulo.`;
            contextualSummary = await executeAgent(settings.agents.summarizer, summarizerPrompt, 'Você é um especialista em criar resumos contextuais detalhados e coesos.');
            logStatus('Resumo contextual atualizado.', 'info');
        }
        return fullBookContent;
    }

    /**
     * Phase 4: Conclude the generation process.
     * @param {string} content - The final content of the book.
     */
    function phase4_conclusion(content) {
        if (content && content.length > 0) {
            logStatus('Geração do livro concluída com sucesso!', 'success');
            exportBtn.style.display = 'block';
        } else {
            logStatus('A geração do livro falhou ou não produziu conteúdo.', 'error');
        }
    }

    /**
     * Helper to count words in a string.
     * @param {string} str - The string to count words from.
     * @returns {number} The number of words.
     */
    function getWordCount(str) {
        return str.trim().split(/\s+/).length;
    }

    /**
     * Handles exporting the generated content to a text file.
     */
    function exportContent() {
        const htmlContent = bookOutput.innerHTML;
        // A simple conversion from HTML to plain text
        const textContent = htmlContent
            .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '\n\n-- $1 --\n\n')
            .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')
            .replace(/<br\s*\/?>/gi, '\n')
            .trim();

        const element = document.createElement('a');
        element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(textContent));
        element.setAttribute('download', 'livro_gerado.txt');
        element.style.display = 'none';
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
        logStatus('Conteúdo exportado para TXT.', 'info');
    }

    // --- Event Listeners ---
    fetchModelsBtn.addEventListener('click', fetchModels);
    startGenerationBtn.addEventListener('click', startGeneration);
    exportBtn.addEventListener('click', exportContent);
    // --- Combo Box Logic ---

    function setupComboBox(inputElement, valueElement, dropdownElement, options) {
        let filteredOptions = [];

        function renderDropdown() {
            dropdownElement.innerHTML = '';
            if (filteredOptions.length === 0 && inputElement.value.length > 0) {
                const noResults = document.createElement('div');
                noResults.classList.add('combo-box-dropdown-item');
                noResults.textContent = 'Nenhum resultado';
                dropdownElement.appendChild(noResults);
            } else {
                filteredOptions.forEach(optionText => {
                    const item = document.createElement('div');
                    item.classList.add('combo-box-dropdown-item');
                    item.textContent = optionText;
                    item.addEventListener('click', () => {
                        inputElement.value = optionText;
                        valueElement.value = optionText;
                        dropdownElement.style.display = 'none';
                    });
                    dropdownElement.appendChild(item);
                });
            }
            dropdownElement.style.display = filteredOptions.length > 0 || inputElement.value.length > 0 ? 'block' : 'none';
        }

        inputElement.addEventListener('input', () => {
            const query = inputElement.value.toLowerCase();
            filteredOptions = options.filter(option => option.toLowerCase().includes(query));
            renderDropdown();
        });

        inputElement.addEventListener('focus', () => {
            if (inputElement.value === '') {
                filteredOptions = [...options];
            } else {
                const query = inputElement.value.toLowerCase();
                filteredOptions = options.filter(option => option.toLowerCase().includes(query));
            }
            renderDropdown();
        });

        document.addEventListener('click', (event) => {
            if (!inputElement.contains(event.target) && !dropdownElement.contains(event.target)) {
                dropdownElement.style.display = 'none';
            }
        });

        // Initialize with default value if hidden input has one
        if (valueElement.value) {
            inputElement.value = valueElement.value;
        }
    }

    function setupMultiComboBox(inputElement, valueElement, dropdownElement, tagsContainer, allOptions) {
        let selectedValues = JSON.parse(valueElement.value || '[]');
        let filteredOptions = [];

        function renderTags() {
            tagsContainer.innerHTML = '';
            selectedValues.forEach(value => {
                const tag = document.createElement('span');
                tag.classList.add('selected-tag');
                tag.textContent = value;
                const removeBtn = document.createElement('span');
                removeBtn.classList.add('selected-tag-remove');
                removeBtn.textContent = 'x';
                removeBtn.addEventListener('click', () => {
                    selectedValues = selectedValues.filter(val => val !== value);
                    valueElement.value = JSON.stringify(selectedValues);
                    renderTags();
                    renderDropdown(); // Re-render dropdown to show removed option
                });
                tag.appendChild(removeBtn);
                tagsContainer.appendChild(tag);
            });
        }

        function renderDropdown() {
            dropdownElement.innerHTML = '';
            const availableOptions = allOptions.filter(option => !selectedValues.includes(option));

            if (filteredOptions.length === 0 && inputElement.value.length > 0) {
                const noResults = document.createElement('div');
                noResults.classList.add('combo-box-dropdown-item');
                noResults.textContent = 'Nenhum resultado';
                dropdownElement.appendChild(noResults);
            } else {
                filteredOptions.forEach(optionText => {
                    const item = document.createElement('div');
                    item.classList.add('combo-box-dropdown-item');
                    item.textContent = optionText;
                    item.addEventListener('click', () => {
                        if (!selectedValues.includes(optionText)) {
                            selectedValues.push(optionText);
                            valueElement.value = JSON.stringify(selectedValues);
                            renderTags();
                            inputElement.value = ''; // Clear input after selection
                            filteredOptions = allOptions.filter(option => option.toLowerCase().includes('')); // Reset filtered options
                            renderDropdown();
                        }
                    });
                    dropdownElement.appendChild(item);
                });
            }
            dropdownElement.style.display = filteredOptions.length > 0 || inputElement.value.length > 0 ? 'block' : 'none';
        }

        inputElement.addEventListener('input', () => {
            const query = inputElement.value.toLowerCase();
            filteredOptions = allOptions.filter(option =>
                option.toLowerCase().includes(query) && !selectedValues.includes(option)
            );
            renderDropdown();
        });

        inputElement.addEventListener('focus', () => {
            const query = inputElement.value.toLowerCase();
            filteredOptions = allOptions.filter(option =>
                option.toLowerCase().includes(query) && !selectedValues.includes(option)
            );
            renderDropdown();
        });

        document.addEventListener('click', (event) => {
            if (!inputElement.contains(event.target) && !dropdownElement.contains(event.target) && !tagsContainer.contains(event.target)) {
                dropdownElement.style.display = 'none';
            }
        });

        renderTags(); // Initial render of selected tags
    }

});
