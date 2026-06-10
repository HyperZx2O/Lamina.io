const fs = require('fs');
const path = require('path');

const NCTB_DIR = path.resolve(__dirname, '..', '..', 'data', 'nctb-curriculum');

class RAGEngine {
  constructor() {
    this.chunks = [];
    this.index = null;
    this.loaded = false;
  }

  tokenize(text) {
    const cleaned = text.toLowerCase().replace(/[^\w\u0980-\u09FF\s]/g, '');
    return cleaned.split(/\s+/).filter(Boolean);
  }

  buildIndex() {
    const N = this.chunks.length;
    const df = {};

    this.chunks.forEach((chunk, i) => {
      const tokens = this.tokenize(chunk.text);
      const seen = new Set();
      tokens.forEach(t => {
        if (!seen.has(t)) {
          seen.add(t);
          df[t] = (df[t] || 0) + 1;
        }
      });
      chunk._tokens = tokens;
    });

    const idf = {};
    Object.entries(df).forEach(([term, count]) => {
      idf[term] = Math.log((N + 1) / (count + 1)) + 1;
    });

    this.chunks.forEach(chunk => {
      const tf = {};
      chunk._tokens.forEach(t => { tf[t] = (tf[t] || 0) + 1; });
      const maxFreq = Math.max(...Object.values(tf), 1);
      const vec = {};
      Object.entries(tf).forEach(([t, f]) => {
        vec[t] = (f / maxFreq) * (idf[t] || 1);
      });
      chunk._vector = vec;
    });

    this.idf = idf;
    this.loaded = true;
  }

  cosineSimilarity(vecA, vecB) {
    let dot = 0, magA = 0, magB = 0;
    const allKeys = new Set([...Object.keys(vecA), ...Object.keys(vecB)]);
    allKeys.forEach(k => {
      const a = vecA[k] || 0;
      const b = vecB[k] || 0;
      dot += a * b;
      magA += a * a;
      magB += b * b;
    });
    const denom = Math.sqrt(magA) * Math.sqrt(magB);
    return denom === 0 ? 0 : dot / denom;
  }

  queryVector(text) {
    const tokens = this.tokenize(text);
    const tf = {};
    tokens.forEach(t => { tf[t] = (tf[t] || 0) + 1; });
    const maxFreq = Math.max(...Object.values(tf), 1);
    const vec = {};
    Object.entries(tf).forEach(([t, f]) => {
      vec[t] = (f / maxFreq) * (this.idf[t] || 1);
    });
    return vec;
  }

  loadContent() {
    const allChunks = [];

    function walk(dir) {
      let entries;
      try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
      entries.forEach(entry => {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(fullPath);
        else if (entry.name.endsWith('.json') && entry.name !== 'index.json') {
          try {
            const data = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
            const classInfo = path.basename(path.dirname(path.dirname(fullPath)));
            const subject = path.basename(path.dirname(fullPath));
            if (data.sections && Array.isArray(data.sections)) {
              data.sections.forEach((section, idx) => {
                allChunks.push({
                  id: `${classInfo}/${subject}/${data.chapter}-${idx}`,
                  class: classInfo,
                  subject: data.subject || subject,
                  chapter: data.chapter,
                  chapterTitle: data.title || '',
                  chapterTitleBn: data.titleBn || '',
                  sectionTitle: section.title || '',
                  text: [data.title || '', data.titleBn || '', section.title || '', section.content || ''].filter(Boolean).join(' '),
                  raw: section.content || '',
                  classLabel: data.class,
                  subjectLabel: data.subjectLabel || subject,
                });
              });
            }
          } catch (e) {
            console.warn(`Skipping ${fullPath}: ${e.message}`);
          }
        }
      });
    }

    walk(NCTB_DIR);
    this.chunks = allChunks;
    if (this.chunks.length) {
      this.buildIndex();
    }
    return this.chunks.length;
  }

  search(query, { topK = 5, minScore = 0.08, classFilter, subjectFilter } = {}) {
    if (!this.loaded || !this.chunks.length) return [];

    const qVec = this.queryVector(query);
    let scored = this.chunks.map((chunk, i) => ({
      chunk,
      score: this.cosineSimilarity(qVec, chunk._vector),
    }));

    if (classFilter) {
      scored = scored.filter(s => s.chunk.class === classFilter);
    }
    if (subjectFilter) {
      scored = scored.filter(s => s.chunk.subject === subjectFilter);
    }

    scored.sort((a, b) => b.score - a.score);
    const passed = minScore > 0 ? scored.filter(s => s.score >= minScore) : scored;
    return passed.slice(0, topK);
  }

  formatContext(results) {
    if (!results.length) return '';
    return results.map((r, i) => {
      const { chunk, score } = r;
      return `[Source ${i + 1}] Class: ${chunk.classLabel || chunk.class}, Subject: ${chunk.subjectLabel || chunk.subject}, Chapter: ${chunk.chapterTitle || chunk.chapter}${chunk.sectionTitle ? `, Section: ${chunk.sectionTitle}` : ''}
Relevance: ${(score * 100).toFixed(0)}%
Content: ${chunk.raw}
`;
    }).join('\n');
  }

  getStats() {
    return {
      loaded: this.loaded,
      totalChunks: this.chunks.length,
      idfTerms: this.idf ? Object.keys(this.idf).length : 0,
    };
  }

  getSubjects() {
    const map = {};
    this.chunks.forEach(ch => {
      if (!map[ch.class]) map[ch.class] = new Set();
      map[ch.class].add(ch.subject);
    });
    const result = {};
    Object.entries(map).forEach(([cls, subjects]) => {
      result[cls] = [...subjects].sort();
    });
    return result;
  }
}

const singleton = new RAGEngine();
module.exports = singleton;
