document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    // API & Model Config
    const apiEndpointInput = document.getElementById('api-endpoint');
    const apiKeyInput = document.getElementById('api-key');
    const fetchModelsBtn = document.getElementById('fetch-models-btn');

    // Agent Config
    const agentSelects = {
        planner: { primary: document.getElementById('planner-primary'), fallback: document.getElementById('planner-fallback') },
        writer: { primary: document.getElementById('writer-primary'), fallback: document.getElementById('writer-fallback') },
        critic: { primary: document.getElementById('critic-primary'), fallback: document.getElementById('critic-fallback') },
        summarizer: { primary: document.getElementById('summarizer-primary'), fallback: document.getElementById('summarizer-fallback') }
    };

    // Generation Parameters (New & Old)
    const bookThemeInput = document.getElementById('book-theme');
    const authorRoleInput = document.getElementById('gpt-role');
    const genreInput = document.getElementById('genre');
    const keywordsInput = document.getElementById('keywords');
    const targetWordCountInput = document.getElementById('target-word-count');
    const maxRetriesInput = document.getElementById('max-retries');

    // Controls & Visualization
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
        let color = 'text-info';
        if (type === 'error') color = 'text-danger';
        if (type === 'success') color = 'text-success';
        if (type === 'debug') color = 'text-muted';

        statusLog.innerHTML += `<p class="${color}">[${timestamp}] ${message}</p>`;
        statusLog.scrollTop = statusLog.scrollHeight;
    }

    // --- Core Logic ---

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
            const response = await fetch(`${endpoint}/models`, { headers: { 'Authorization': `Bearer ${apiKey}` } });
            if (!response.ok) throw new Error(`Falha na requisição à API: ${response.statusText}`);
            const data = await response.json();
            const models = data.data || [];
            Object.values(agentSelects).forEach(agent => {
                agent.primary.innerHTML = '';
                agent.fallback.innerHTML = '';
            });
            if (models.length === 0) {
                logStatus('Nenhum modelo encontrado.', 'error');
                return;
            }
            models.forEach(model => {
                if (model.id) {
                    const option = document.createElement('option');
                    option.value = model.id;
                    option.textContent = model.id;
                    Object.values(agentSelects).forEach(agent => {
                        agent.primary.appendChild(option.cloneNode(true));
                        agent.fallback.appendChild(option.cloneNode(true));
                    });
                }
            });
            logStatus(`Carregados ${models.length} modelos com sucesso.`, 'success');
        } catch (error) {
            logStatus(`Erro ao buscar modelos: ${error.message}`, 'error');
        } finally {
            fetchModelsBtn.disabled = false;
        }
    }

    async function executeAgent(agentConfig, prompt, systemMessage) {
        const endpoint = apiEndpointInput.value;
        const apiKey = apiKeyInput.value;
        const modelsToTry = [agentConfig.primary, ...agentConfig.fallback];

        // Log a snippet of the prompt for verification purposes
        logStatus(`Enviando prompt para o agente: "${prompt.substring(0, 80)}..."`, 'debug');

        for (const model of modelsToTry) {
            if (!model) continue;
            logStatus(`Agente (${systemMessage.substring(0, 30)}...): Tentando o modelo: ${model}...`);
            try {
                const response = await fetch(`${endpoint}/chat/completions`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        model: model,
                        messages: [{ role: 'system', content: systemMessage }, { role: 'user', content: prompt }]
                    })
                });
                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(`Falha na API: ${errorData.error?.message || response.statusText}`);
                }
                const data = await response.json();
                const content = data.choices[0]?.message?.content;
                if (!content) throw new Error('Resposta vazia do modelo.');
                logStatus(`Sucesso com o modelo: ${model}.`, 'success');
                return content;
            } catch (error) {
                logStatus(`Erro com o modelo ${model}: ${error.message}. Tentando o próximo...`, 'error');
            }
        }
        throw new Error('Todos os modelos (primário e de fallback) falharam para o agente.');
    }

    async function startGeneration() {
        logStatus('Iniciando o processo de geração do livro...');
        startGenerationBtn.disabled = true;
        bookOutput.innerHTML = '';

        try {
            const settings = {
                apiKey: apiKeyInput.value,
                apiEndpoint: apiEndpointInput.value,
                bookTheme: bookThemeInput.value,
                authorRole: authorRoleInput.value || "um assistente de IA prestativo",
                genre: genreInput.value,
                keywords: keywordsInput.value,
                targetWordCount: parseInt(targetWordCountInput.value, 10),
                maxRetries: parseInt(maxRetriesInput.value, 10),
                agents: {
                    planner: { primary: agentSelects.planner.primary.value, fallback: Array.from(agentSelects.planner.fallback.selectedOptions).map(o => o.value) },
                    writer: { primary: agentSelects.writer.primary.value, fallback: Array.from(agentSelects.writer.fallback.selectedOptions).map(o => o.value) },
                    critic: { primary: agentSelects.critic.primary.value, fallback: Array.from(agentSelects.critic.fallback.selectedOptions).map(o => o.value) },
                    summarizer: { primary: agentSelects.summarizer.primary.value, fallback: Array.from(agentSelects.summarizer.fallback.selectedOptions).map(o => o.value) }
                }
            };

            if (!settings.apiKey || !settings.apiEndpoint || !settings.bookTheme) {
                logStatus('Por favor, preencha a API, Chave e Tema do Livro antes de iniciar.', 'error');
                throw new Error("Configurações faltando.");
            }

            const blueprint = await phase1_planning(settings);
            if (!blueprint) {
                logStatus("Planejamento cancelado ou falhou.", 'error');
                return;
            }

            const fullBookContent = await phase2_3_generation_and_consolidation(settings, blueprint);
            phase4_conclusion(fullBookContent);

        } catch (error) {
            logStatus(`Ocorreu um erro na geração: ${error.message}`, 'error');
        } finally {
            startGenerationBtn.disabled = false;
            approvalContainer.style.display = 'none';
        }
    }

    function waitForApproval(title, content) {
        return new Promise((resolve) => {
            approvalContainer.style.display = 'block';
            approvalContent.innerHTML = `<h6>${title}</h6><pre>${content}</pre>`;
            approveBtn.onclick = () => { approvalContainer.style.display = 'none'; resolve(true); };
            rejectBtn.onclick = () => { approvalContainer.style.display = 'none'; resolve(false); };
        });
    }

    async function phase1_planning(settings) {
        const plannerSystemMessage = `Você é um arquiteto de conteúdo experiente. O seu papel é ${settings.authorRole}.`;

        logStatus("Fase 1: Gerando a lista de capítulos...");
        const chapterListPrompt = `Gere uma lista de capítulos para um livro do gênero "${settings.genre}" com o tema central "${settings.bookTheme}". Inclua as seguintes palavras-chave: ${settings.keywords}. O livro deve ter cerca de ${settings.targetWordCount} palavras. Retorne apenas a lista de títulos de capítulos, um por linha.`;
        const chapterListStr = await executeAgent(settings.agents.planner, chapterListPrompt, plannerSystemMessage);
        const chapters = chapterListStr.split('\n').filter(c => c.trim() !== '');

        const isChapterListApproved = await waitForApproval("Aprovar Lista de Capítulos?", chapters.join('\n'));
        if (!isChapterListApproved) return null;
        logStatus("Lista de capítulos aprovada.", "success");

        logStatus("Gerando o blueprint de parágrafos para cada capítulo...");
        const fullBlueprint = [];
        for (const chapterTitle of chapters) {
            logStatus(`Gerando blueprint para: "${chapterTitle}"`);
            const paragraphPrompt = `Para o capítulo "${chapterTitle}", crie um "Blueprint de Parágrafos" em formato JSON. Cada item na lista JSON deve representar um parágrafo e conter 'ideia_central' (o propósito do parágrafo) e 'palavras_alvo' (uma contagem de palavras estimada).`;
            const paragraphBlueprintStr = await executeAgent(settings.agents.planner, paragraphPrompt, plannerSystemMessage);
            try {
                const paragraphBlueprints = JSON.parse(paragraphBlueprintStr);
                fullBlueprint.push({ chapter: chapterTitle, paragraphs: paragraphBlueprints });
            } catch (e) {
                logStatus(`Erro ao processar o blueprint do capítulo "${chapterTitle}". Pulando.`, 'error');
            }
        }

        const formattedBlueprint = fullBlueprint.map(chap => `Capítulo: ${chap.chapter}\n` + chap.paragraphs.map(p => `  - ${p.ideia_central} (${p.palavras_alvo} palavras)`).join('\n')).join('\n\n');
        const isBlueprintApproved = await waitForApproval("Aprovar Blueprint Completo?", formattedBlueprint);
        return isBlueprintApproved ? fullBlueprint : null;
    }

    async function phase2_3_generation_and_consolidation(settings, blueprint) {
        let fullBookContent = '';
        let contextualSummary = `Resumo inicial do livro com o tema "${settings.bookTheme}", gênero "${settings.genre}", e palavras-chave "${settings.keywords}".`;

        for (const chapter of blueprint) {
            logStatus(`Iniciando Capítulo: ${chapter.chapter}`, 'info');
            let chapterContent = `<h2>${chapter.chapter}</h2>\n`;

            for (const paragraph of chapter.paragraphs) {
                logStatus(`Gerando parágrafo: "${paragraph.ideia_central}"`);
                let currentText = '';
                let approved = false;

                for (let i = 0; i < settings.maxRetries; i++) {
                    logStatus(`Tentativa ${i + 1}/${settings.maxRetries}...`);
                    const writerSystemMessage = `Você é um escritor criativo. Seu papel é ${settings.authorRole}.`;
                    const writerPrompt = `Escreva um parágrafo com cerca de ${paragraph.palavras_alvo} palavras sobre a ideia: "${paragraph.ideia_central}". Contexto do livro até agora: "${contextualSummary}". O texto a ser refinado (se houver) é: "${currentText}"`;
                    currentText = await executeAgent(settings.agents.writer, writerPrompt, writerSystemMessage);

                    const wordCount = currentText.trim().split(/\s+/).length;
                    const tolerance = 0.3; // 30% tolerance
                    if (wordCount < paragraph.palavras_alvo * (1 - tolerance) || wordCount > paragraph.palavras_alvo * (1 + tolerance)) {
                        logStatus(`Contagem de palavras (${wordCount}) fora da meta. Refinando...`, 'info');
                        currentText = await executeAgent(settings.agents.writer, `Refine o texto a seguir para ter cerca de ${paragraph.palavras_alvo} palavras: "${currentText}"`, writerSystemMessage);
                        continue;
                    }

                    const criticSystemMessage = `Você é um crítico literário rigoroso. Seu papel é ${settings.authorRole}.`;
                    const criticPrompt = `O parágrafo a seguir cumpre a ideia central de forma eficaz? Ideia Central: "${paragraph.ideia_central}". Parágrafo: "${currentText}". Se sim, responda apenas "OK". Se não, forneça um feedback conciso para o escritor.`;
                    const feedback = await executeAgent(settings.agents.critic, criticPrompt, criticSystemMessage);

                    if (feedback.trim().toUpperCase() === 'OK') {
                        logStatus('Parágrafo aprovado pelo crítico.', 'success');
                        approved = true;
                        break;
                    } else {
                        logStatus(`Crítico solicitou revisão: "${feedback}". Refinando...`, 'info');
                        currentText = await executeAgent(settings.agents.writer, `Refine o parágrafo a seguir com base no feedback do crítico. Feedback: "${feedback}". Parágrafo original: "${currentText}"`, writerSystemMessage);
                    }
                }

                if (approved) {
                    const p_tag = `<p>${currentText}</p>\n`;
                    chapterContent += p_tag;
                    bookOutput.innerHTML += p_tag;
                } else {
                    logStatus(`Falha ao aprovar o parágrafo "${paragraph.ideia_central}". Pulando.`, 'error');
                }
            }

            fullBookContent += chapterContent;

            const summarizerSystemMessage = `Você é um especialista em criar resumos contextuais. Seu papel é ${settings.authorRole}.`;
            const summarizerPrompt = `O resumo contextual atual é: "${contextualSummary}". O novo capítulo gerado é: "${chapterContent}". Crie um novo resumo detalhado que incorpore as informações do novo capítulo.`;
            contextualSummary = await executeAgent(settings.agents.summarizer, summarizerPrompt, summarizerSystemMessage);
            logStatus('Resumo contextual atualizado.', 'info');
        }
        return fullBookContent;
    }

    function phase4_conclusion(content) {
        if (content && content.length > 0) {
            logStatus('Geração do livro concluída com sucesso!', 'success');
            exportBtn.style.display = 'block';
        } else {
            logStatus('A geração do livro falhou ou não produziu conteúdo.', 'error');
        }
    }

    function exportContent() {
        const htmlContent = bookOutput.innerHTML;
        const textContent = htmlContent.replace(/<h2[^>]*>(.*?)<\/h2>/gi, '\n\n-- $1 --\n\n').replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n').trim();
        const element = document.createElement('a');
        element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(textContent));
        element.setAttribute('download', 'livro_gerado.txt');
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
    }

    // --- Event Listeners ---
    fetchModelsBtn.addEventListener('click', fetchModels);
    startGenerationBtn.addEventListener('click', startGeneration);
    exportBtn.addEventListener('click', exportContent);
});
