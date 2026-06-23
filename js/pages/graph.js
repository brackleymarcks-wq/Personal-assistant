// ============================================
// GRAPH VIEW (Obsidian-style)
// ============================================

window.GraphPage = {
  container: null,
  network: null,
  nodes: new vis.DataSet([]),
  edges: new vis.DataSet([]),

  async init() {
    try {
      console.log('GraphPage init');
      this.container = document.getElementById('graph-container');
      
      // Get computed styles for canvas
      const style = getComputedStyle(document.body);
    const textColor = style.getPropertyValue('--text-primary').trim() || '#fff';
    const borderColor = style.getPropertyValue('--border-light').trim() || '#333';
    const accentColor = style.getPropertyValue('--accent').trim() || '#4facfe';

    // Initialize empty network first
    const data = { nodes: this.nodes, edges: this.edges };
    const options = {
      nodes: {
        shape: 'dot',
        size: 16,
        font: {
          color: textColor,
          size: 14,
          face: 'Inter'
        },
        borderWidth: 2,
        shadow: true
      },
      edges: {
        width: 1.5,
        color: { color: borderColor, highlight: accentColor, hover: accentColor },
        smooth: { type: 'continuous' }
      },
      physics: {
        forceAtlas2Based: {
          gravitationalConstant: -50,
          centralGravity: 0.01,
          springLength: 100,
          springConstant: 0.08
        },
        maxVelocity: 50,
        solver: 'forceAtlas2Based',
        timestep: 0.35,
        stabilization: { iterations: 150 }
      },
      interaction: {
        hover: true,
        tooltipDelay: 200,
        zoomView: true,
        dragView: true
      }
    };

    this.network = new vis.Network(this.container, data, options);
    
    // Double click node to open in PeekView
      this.network.on('doubleClick', (params) => {
        if (params.nodes.length > 0) {
          const nodeId = params.nodes[0];
          const node = this.nodes.get(nodeId);
          if (node && node.entityType && node.entityId && window.PeekView) {
            window.PeekView.open(node.entityType, node.entityId);
          }
        }
      });

      await this.loadGraph();
    } catch (e) {
      console.error(e);
      if (window.UI) UI.toast('Graph init error: ' + e.message, 'error');
    }
  },

  render() {
    return `
      <div class="page-header" style="display:flex; justify-content:space-between; align-items:center;">
        <div>
          <h1 class="page-title">Граф связей</h1>
          <p class="page-subtitle">Визуализация всех ваших проектов, задач и заметок</p>
        </div>
        <button class="btn btn-primary" onclick="GraphPage.loadGraph()">Обновить граф</button>
      </div>
      
      <div id="graph-container" style="width: 100%; height: calc(100vh - 160px); border-radius: 16px; background: var(--bg-surface); border: 1px solid var(--border-light); overflow: hidden;">
        <!-- Vis Network will render here -->
      </div>
    `;
  },

  async loadGraph() {
    if (!this.network) return;
    try {
      // Fetch all entities
    const tasks = await DB.getTasks();
    const projects = await DB.getProjects();
    const notes = await DB.getNotes();
    const knowledge = await DB.getKnowledgeItems ? await DB.getKnowledgeItems() : [];

    const newNodes = [];
    const newEdges = [];
    const idMap = new Map(); // Store normalizedTitle -> nodeId

    // Helpers
    const normalize = (t) => (t || '').toLowerCase().trim();
    const addNode = (id, label, group, color, entityType, entityId) => {
      newNodes.push({ id, label, group, color: { background: color.bg, border: color.border }, entityType, entityId });
      idMap.set(normalize(label), id);
    };

    // Colors
    const colors = {
      project: { bg: '#ff9f43', border: '#ee5253' },
      task: { bg: '#10ac84', border: '#01a3a4' },
      note: { bg: '#5f27cd', border: '#341f97' },
      knowledge: { bg: '#0abde3', border: '#0984e3' },
      tag: { bg: '#c8d6e5', border: '#8395a7' }
    };

    // 1. Projects
    projects.forEach(p => {
      addNode('proj_' + p.id, p.name, 'project', colors.project, 'project', p.id);
    });

    // 2. Tasks
    tasks.forEach(t => {
      const isDone = t.status === 'Готово';
      const c = isDone ? { bg: '#8395a7', border: '#576574' } : colors.task;
      addNode('task_' + t.id, t.title, 'task', c, 'task', t.id);
      
      // Implicit link: task -> project (via tags/direction?)
      // Since direction acts like a project/tag in this app
      if (t.direction) {
        const dNorm = normalize(t.direction);
        let targetId = idMap.get(dNorm);
        if (!targetId) {
          targetId = 'tag_' + dNorm;
          addNode(targetId, '#' + t.direction, 'tag', colors.tag, 'tag', null);
        }
        newEdges.push({ from: 'task_' + t.id, to: targetId, dashes: true });
      }
    });

    // 3. Notes
    notes.forEach(n => {
      addNode('note_' + n.id, n.title, 'note', colors.note, 'note', n.id);
      if (n.tags) {
        n.tags.forEach(tag => {
          const tNorm = normalize(tag);
          let targetId = idMap.get(tNorm);
          if (!targetId) {
            targetId = 'tag_' + tNorm;
            addNode(targetId, '#' + tag, 'tag', colors.tag, 'tag', null);
          }
          newEdges.push({ from: 'note_' + n.id, to: targetId, dashes: true });
        });
      }
    });

    // 4. Knowledge
    knowledge.forEach(k => {
      addNode('kb_' + k.id, k.title, 'knowledge', colors.knowledge, 'knowledge', k.id);
      if (k.tags) {
        k.tags.forEach(tag => {
          const tNorm = normalize(tag);
          let targetId = idMap.get(tNorm);
          if (!targetId) {
            targetId = 'tag_' + tNorm;
            addNode(targetId, '#' + tag, 'tag', colors.tag, 'tag', null);
          }
          newEdges.push({ from: 'kb_' + k.id, to: targetId, dashes: true });
        });
      }
    });

    // 5. Build explicit links from [[Title]] markdown syntax
    const parseContentLinks = (sourceId, text) => {
      if (!text) return;
      const regex = /\[\[(.*?)\]\]/g;
      let match;
      while ((match = regex.exec(text)) !== null) {
        const targetTitle = normalize(match[1]);
        const targetId = idMap.get(targetTitle);
        if (targetId && targetId !== sourceId) {
          newEdges.push({ from: sourceId, to: targetId, arrows: 'to' });
        }
      }
    };

    tasks.forEach(t => parseContentLinks('task_' + t.id, t.next_step));
    notes.forEach(n => parseContentLinks('note_' + n.id, n.content));
    knowledge.forEach(k => parseContentLinks('kb_' + k.id, k.content));

    // Update datasets
    this.nodes.clear();
    this.edges.clear();
    this.nodes.add(newNodes);
    this.edges.add(newEdges);

      // Fit graph
      setTimeout(() => {
        if (this.network) {
          this.network.fit({ animation: { duration: 1000, easingFunction: 'easeInOutQuad' } });
        }
      }, 500);
    } catch (e) {
      console.error(e);
      if (window.UI) UI.toast('Graph load error: ' + e.message, 'error');
    }
  }
};
