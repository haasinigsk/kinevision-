# Physics Visualization System - Code Structure & Architecture

## 📁 Project Structure

```
physics-visualization-system/
│
├── frontend/                          # React-based UI
│   ├── src/
│   │   ├── components/
│   │   │   ├── ProblemInput.jsx      # Text input component
│   │   │   ├── Visualization.jsx     # Canvas-based simulation
│   │   │   ├── ParameterControls.jsx # Real-time sliders
│   │   │   ├── AIAnalysis.jsx        # Parsed data display
│   │   │   └── ExampleLibrary.jsx    # Pre-built examples
│   │   │
│   │   ├── services/
│   │   │   ├── aiService.js          # Claude API integration
│   │   │   ├── physicsEngine.js      # Simulation calculations
│   │   │   └── parserService.js      # Text parsing utilities
│   │   │
│   │   ├── utils/
│   │   │   ├── constants.js          # Physics constants
│   │   │   ├── mathHelpers.js        # Mathematical utilities
│   │   │   └── canvasHelpers.js      # Drawing utilities
│   │   │
│   │   ├── hooks/
│   │   │   ├── useSimulation.js      # Animation loop hook
│   │   │   ├── useAIAnalysis.js      # AI parsing hook
│   │   │   └── usePhysicsEngine.js   # Physics calculations
│   │   │
│   │   ├── App.jsx                   # Main application
│   │   └── index.js                  # Entry point
│   │
│   ├── public/
│   │   └── index.html
│   │
│   └── package.json
│
├── backend/                           # Python/Node.js API
│   ├── api/
│   │   ├── routes/
│   │   │   ├── analyze.js            # Problem analysis endpoint
│   │   │   ├── simulate.js           # Simulation data endpoint
│   │   │   └── examples.js           # Example problems
│   │   │
│   │   ├── services/
│   │   │   ├── nlpService.py         # NLP processing (Python)
│   │   │   ├── claudeService.js      # Claude API wrapper
│   │   │   └── physicsSolver.py      # Physics calculations
│   │   │
│   │   ├── models/
│   │   │   ├── Problem.js            # Problem data model
│   │   │   ├── Simulation.js         # Simulation config
│   │   │   └── PhysicsEntity.js      # Entity representation
│   │   │
│   │   └── middleware/
│   │       ├── validator.js          # Input validation
│   │       └── errorHandler.js       # Error handling
│   │
│   ├── ml/                           # Machine Learning components
│   │   ├── entity_extraction.py     # Entity recognition
│   │   ├── parameter_parser.py      # Parameter extraction
│   │   └── problem_classifier.py    # Problem type classification
│   │
│   └── requirements.txt / package.json
│
├── shared/                           # Shared utilities
│   ├── types/
│   │   ├── Problem.ts               # TypeScript interfaces
│   │   ├── Simulation.ts
│   │   └── Entity.ts
│   │
│   └── constants/
│       └── physics.ts               # Physics constants
│
├── docs/                            # Documentation
│   ├── API.md                       # API documentation
│   ├── ARCHITECTURE.md              # System architecture
│   ├── DEPLOYMENT.md                # Deployment guide
│   └── USER_GUIDE.md                # User documentation
│
├── tests/                           # Test suites
│   ├── unit/
│   ├── integration/
│   └── e2e/
│
└── README.md
```

---

## 🏗️ System Architecture

### 1. Frontend Architecture (React)

```javascript
// Component Hierarchy
App
├── Header
├── MainLayout
│   ├── InputPanel
│   │   ├── ProblemInput
│   │   └── ExampleLibrary
│   ├── VisualizationPanel
│   │   ├── Canvas (Simulation)
│   │   └── ParameterControls
│   └── AnalysisPanel
│       └── AIExtraction
└── Footer
```

#### Key Components:

**ProblemInput.jsx**
```javascript
import React, { useState } from 'react';
import { analyzePhysicsProblem } from '../services/aiService';

const ProblemInput = ({ onAnalysis }) => {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    const result = await analyzePhysicsProblem(text);
    onAnalysis(result);
    setLoading(false);
  };

  return (
    <div className="problem-input">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Enter physics problem..."
      />
      <button onClick={handleSubmit} disabled={loading}>
        {loading ? 'Analyzing...' : 'Analyze'}
      </button>
    </div>
  );
};

export default ProblemInput;
```

**Visualization.jsx**
```javascript
import React, { useRef, useEffect } from 'react';
import { useSimulation } from '../hooks/useSimulation';

const Visualization = ({ parsedData, parameters }) => {
  const canvasRef = useRef(null);
  const { state, animate } = useSimulation(parsedData, parameters);

  useEffect(() => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    animate(ctx);
  }, [parsedData, parameters]);

  return (
    <canvas
      ref={canvasRef}
      width={800}
      height={600}
      className="simulation-canvas"
    />
  );
};

export default Visualization;
```

---

### 2. Backend Architecture (Node.js + Python)

#### API Layer (Node.js/Express)

**routes/analyze.js**
```javascript
const express = require('express');
const router = express.Router();
const { analyzeProblem } = require('../services/claudeService');
const { extractEntities } = require('../services/nlpService');

router.post('/analyze', async (req, res) => {
  try {
    const { problemText } = req.body;
    
    // Step 1: AI analysis
    const aiResult = await analyzeProblem(problemText);
    
    // Step 2: Entity extraction
    const entities = await extractEntities(problemText);
    
    // Step 3: Merge results
    const structuredData = {
      ...aiResult,
      entities,
      timestamp: new Date().toISOString()
    };
    
    res.json(structuredData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
```

**services/claudeService.js**
```javascript
const Anthropic = require('@anthropic-ai/sdk');

class ClaudeService {
  constructor() {
    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    });
  }

  async analyzeProblem(problemText) {
    const prompt = `Analyze this physics problem and extract structured data:

Problem: "${problemText}"

Return JSON with:
{
  "problemType": "string",
  "objects": [{ "name": "string", "mass": number, "position": {...} }],
  "parameters": {
    "initialVelocity": {...},
    "acceleration": {...},
    "gravity": number
  },
  "adjustableParams": [...],
  "description": "string"
}`;

    const message = await this.client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }]
    });

    return JSON.parse(message.content[0].text);
  }
}

module.exports = new ClaudeService();
```

#### ML Layer (Python)

**ml/entity_extraction.py**
```python
import spacy
import re
from typing import Dict, List, Any

class PhysicsEntityExtractor:
    def __init__(self):
        self.nlp = spacy.load('en_core_web_sm')
        
    def extract_entities(self, text: str) -> Dict[str, Any]:
        """Extract physics entities from text"""
        doc = self.nlp(text)
        
        entities = {
            'objects': self._extract_objects(doc),
            'quantities': self._extract_quantities(text),
            'units': self._extract_units(text),
            'actions': self._extract_actions(doc)
        }
        
        return entities
    
    def _extract_objects(self, doc) -> List[str]:
        """Extract physical objects (ball, block, car, etc.)"""
        objects = []
        for token in doc:
            if token.pos_ == 'NOUN' and token.dep_ in ['nsubj', 'dobj']:
                objects.append(token.text)
        return objects
    
    def _extract_quantities(self, text: str) -> Dict[str, float]:
        """Extract numerical values and their types"""
        quantities = {}
        
        # Velocity pattern: "X m/s"
        velocity_match = re.findall(r'(\d+(?:\.\d+)?)\s*m/s', text)
        if velocity_match:
            quantities['velocity'] = float(velocity_match[0])
        
        # Angle pattern: "X degrees"
        angle_match = re.findall(r'(\d+(?:\.\d+)?)\s*degrees?', text)
        if angle_match:
            quantities['angle'] = float(angle_match[0])
        
        # Mass pattern: "X kg"
        mass_match = re.findall(r'(\d+(?:\.\d+)?)\s*kg', text)
        if mass_match:
            quantities['mass'] = float(mass_match[0])
            
        return quantities
    
    def _extract_units(self, text: str) -> List[str]:
        """Extract all units mentioned"""
        unit_pattern = r'\b(m/s²?|kg|m|N|J|W)\b'
        return list(set(re.findall(unit_pattern, text)))
    
    def _extract_actions(self, doc) -> List[str]:
        """Extract action verbs (thrown, slides, accelerates, etc.)"""
        actions = []
        for token in doc:
            if token.pos_ == 'VERB':
                actions.append(token.lemma_)
        return actions

# API endpoint
from flask import Flask, request, jsonify

app = Flask(__name__)
extractor = PhysicsEntityExtractor()

@app.route('/extract', methods=['POST'])
def extract_entities():
    data = request.json
    text = data.get('text', '')
    
    entities = extractor.extract_entities(text)
    return jsonify(entities)

if __name__ == '__main__':
    app.run(port=5000)
```

**ml/problem_classifier.py**
```python
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.naive_bayes import MultinomialNB
import numpy as np

class ProblemClassifier:
    """Classify physics problems into categories"""
    
    PROBLEM_TYPES = [
        'projectile_motion',
        'linear_motion',
        'circular_motion',
        'collision',
        'inclined_plane',
        'pendulum',
        'spring_oscillation',
        'free_fall'
    ]
    
    def __init__(self):
        self.vectorizer = TfidfVectorizer(max_features=100)
        self.classifier = MultinomialNB()
        self._train_model()
    
    def _train_model(self):
        """Train with example problems (in production, use larger dataset)"""
        training_data = [
            ("ball thrown upward", "projectile_motion"),
            ("car accelerates", "linear_motion"),
            ("objects collide", "collision"),
            ("block slides down ramp", "inclined_plane"),
            # ... more training examples
        ]
        
        texts, labels = zip(*training_data)
        X = self.vectorizer.fit_transform(texts)
        self.classifier.fit(X, labels)
    
    def classify(self, text: str) -> str:
        """Classify a problem"""
        X = self.vectorizer.transform([text])
        prediction = self.classifier.predict(X)
        return prediction[0]
    
    def get_confidence(self, text: str) -> dict:
        """Get confidence scores for all categories"""
        X = self.vectorizer.transform([text])
        probabilities = self.classifier.predict_proba(X)[0]
        
        return {
            problem_type: float(prob)
            for problem_type, prob in zip(self.PROBLEM_TYPES, probabilities)
        }
```

---

### 3. Physics Engine

**services/physicsEngine.js**
```javascript
class PhysicsEngine {
  constructor(config) {
    this.config = config;
    this.entities = [];
    this.time = 0;
    this.dt = 0.016; // 60 FPS
  }

  /**
   * Calculate projectile motion
   */
  calculateProjectile(entity, params) {
    const { velocity, angle, gravity } = params;
    const rad = (angle * Math.PI) / 180;
    
    const vx = velocity * Math.cos(rad);
    const vy = velocity * Math.sin(rad);
    
    const x = entity.initialPosition.x + vx * this.time;
    const y = entity.initialPosition.y + vy * this.time - 0.5 * gravity * this.time ** 2;
    
    const velocityX = vx;
    const velocityY = vy - gravity * this.time;
    
    return {
      position: { x, y },
      velocity: { x: velocityX, y: velocityY },
      acceleration: { x: 0, y: -gravity }
    };
  }

  /**
   * Calculate linear motion
   */
  calculateLinear(entity, params) {
    const { initialVelocity, acceleration } = params;
    
    const velocity = initialVelocity + acceleration * this.time;
    const position = entity.initialPosition.x + 
                    initialVelocity * this.time + 
                    0.5 * acceleration * this.time ** 2;
    
    return {
      position: { x: position, y: entity.initialPosition.y },
      velocity: { x: velocity, y: 0 },
      acceleration: { x: acceleration, y: 0 }
    };
  }

  /**
   * Calculate collision (elastic)
   */
  calculateCollision(entity1, entity2, params) {
    const { m1, m2, v1, v2 } = params;
    
    // Conservation of momentum and energy
    const v1Final = ((m1 - m2) * v1 + 2 * m2 * v2) / (m1 + m2);
    const v2Final = ((m2 - m1) * v2 + 2 * m1 * v1) / (m1 + m2);
    
    return {
      entity1: { velocity: v1Final },
      entity2: { velocity: v2Final }
    };
  }

  /**
   * Update simulation
   */
  update(params) {
    this.time += this.dt;
    
    // Update each entity based on problem type
    this.entities.forEach(entity => {
      if (this.config.problemType === 'projectile') {
        entity.state = this.calculateProjectile(entity, params);
      } else if (this.config.problemType === 'linear') {
        entity.state = this.calculateLinear(entity, params);
      }
      // ... other problem types
    });
    
    return this.entities;
  }

  reset() {
    this.time = 0;
    this.entities.forEach(entity => {
      entity.state = {
        position: { ...entity.initialPosition },
        velocity: { x: 0, y: 0 },
        acceleration: { x: 0, y: 0 }
      };
    });
  }
}

module.exports = PhysicsEngine;
```

---

### 4. React Hooks

**hooks/useSimulation.js**
```javascript
import { useState, useEffect, useRef } from 'react';
import PhysicsEngine from '../services/physicsEngine';

export const useSimulation = (parsedData, parameters) => {
  const [state, setState] = useState(null);
  const engineRef = useRef(null);
  const animationRef = useRef(null);

  useEffect(() => {
    if (!parsedData) return;

    // Initialize physics engine
    engineRef.current = new PhysicsEngine({
      problemType: parsedData.problemType,
      entities: parsedData.objects
    });

    // Animation loop
    const animate = () => {
      const newState = engineRef.current.update(parameters);
      setState(newState);
      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [parsedData, parameters]);

  const reset = () => {
    if (engineRef.current) {
      engineRef.current.reset();
    }
  };

  return { state, reset };
};
```

**hooks/useAIAnalysis.js**
```javascript
import { useState } from 'react';
import { analyzePhysicsProblem } from '../services/aiService';

export const useAIAnalysis = () => {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const analyze = async (problemText) => {
    setLoading(true);
    setError(null);

    try {
      const data = await analyzePhysicsProblem(problemText);
      setResult(data);
      return data;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { result, loading, error, analyze };
};
```

---

### 5. Data Models

**models/Problem.js**
```javascript
class Problem {
  constructor(data) {
    this.id = data.id || this.generateId();
    this.text = data.text;
    this.type = data.type;
    this.objects = data.objects || [];
    this.parameters = data.parameters || {};
    this.metadata = {
      createdAt: new Date(),
      source: data.source || 'user',
      difficulty: data.difficulty || 'medium'
    };
  }

  generateId() {
    return `problem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  toJSON() {
    return {
      id: this.id,
      text: this.text,
      type: this.type,
      objects: this.objects,
      parameters: this.parameters,
      metadata: this.metadata
    };
  }

  static fromJSON(json) {
    return new Problem(json);
  }
}

module.exports = Problem;
```

**types/Problem.ts** (TypeScript)
```typescript
export interface PhysicsObject {
  name: string;
  mass?: number;
  initialPosition: { x: number; y: number };
  shape?: 'circle' | 'rectangle' | 'point';
  color?: string;
}

export interface PhysicsParameters {
  initialVelocity?: {
    magnitude: number;
    direction: string;
    angle?: number;
  };
  acceleration?: { x: number; y: number };
  gravity?: number;
  friction?: number;
  angle?: number;
  time?: number;
  distance?: number;
}

export interface Problem {
  id: string;
  text: string;
  problemType: 
    | 'projectile' 
    | 'linear' 
    | 'collision' 
    | 'pendulum' 
    | 'incline' 
    | 'circular';
  objects: PhysicsObject[];
  parameters: PhysicsParameters;
  units: {
    velocity: string;
    acceleration: string;
    distance: string;
    mass?: string;
  };
  adjustableParameters: string[];
  description: string;
}

export interface SimulationState {
  time: number;
  entities: {
    id: string;
    position: { x: number; y: number };
    velocity: { x: number; y: number };
    acceleration: { x: number; y: number };
  }[];
}
```

---

## 🚀 Implementation Steps

### Phase 1: Foundation (Week 1-2)
1. Set up React project structure
2. Integrate Claude API
3. Build basic UI components
4. Implement text input and example library

### Phase 2: Core Features (Week 3-4)
5. Develop NLP entity extraction
6. Create physics engine
7. Build canvas-based visualization
8. Implement parameter extraction

### Phase 3: Interaction (Week 5-6)
9. Add real-time parameter controls
10. Implement animation loop
11. Create interactive sliders
12. Add visual feedback

### Phase 4: Polish (Week 7-8)
13. Performance optimization
14. Error handling
15. User testing
16. Documentation

---

## 📦 Dependencies

### Frontend
```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "@anthropic-ai/sdk": "^0.30.0",
    "lucide-react": "^0.263.1",
    "recharts": "^2.5.0"
  },
  "devDependencies": {
    "vite": "^4.3.0",
    "@types/react": "^18.2.0",
    "typescript": "^5.0.0"
  }
}
```

### Backend (Node.js)
```json
{
  "dependencies": {
    "express": "^4.18.2",
    "@anthropic-ai/sdk": "^0.30.0",
    "cors": "^2.8.5",
    "dotenv": "^16.0.3",
    "axios": "^1.4.0"
  }
}
```

### Backend (Python)
```
flask==2.3.0
spacy==3.5.0
numpy==1.24.0
scikit-learn==1.2.0
python-dotenv==1.0.0
```

---

## 🔒 Environment Variables

```env
# .env
ANTHROPIC_API_KEY=sk-ant-xxxxx
PYTHON_SERVICE_URL=http://localhost:5000
NODE_ENV=development
PORT=3001
```

---

## 🧪 Testing Strategy

```javascript
// tests/unit/physicsEngine.test.js
import PhysicsEngine from '../src/services/physicsEngine';

describe('PhysicsEngine', () => {
  test('calculates projectile motion correctly', () => {
    const engine = new PhysicsEngine({ problemType: 'projectile' });
    const result = engine.calculateProjectile(
      { initialPosition: { x: 0, y: 0 } },
      { velocity: 10, angle: 90, gravity: 9.8 }
    );
    
    expect(result.position.y).toBeGreaterThan(0);
    expect(result.velocity.y).toBeLessThan(10);
  });
});
```

---

## 📊 Performance Optimization

1. **Canvas Optimization**
   - Use requestAnimationFrame
   - Implement dirty rectangle rendering
   - Debounce parameter changes

2. **AI Caching**
   - Cache common problem patterns
   - Implement local storage for recent analyses

3. **Code Splitting**
   - Lazy load physics engines
   - Dynamic imports for visualizations

---

This architecture provides a scalable, maintainable foundation for the Physics Visualization System with clear separation of concerns and modular design.
