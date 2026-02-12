import React, { useState, useEffect, useRef } from 'react';
import { Slider } from 'lucide-react';

const PhysicsVisualizationSystem = () => {
  const [problemText, setProblemText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [parsedData, setParsedData] = useState(null);
  const [simulationParams, setSimulationParams] = useState({});
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const [simulationState, setSimulationState] = useState({
    time: 0,
    position: { x: 0, y: 0 },
    velocity: { x: 0, y: 0 }
  });

  // Example problem templates
  const exampleProblems = [
    "A ball is thrown straight up with a speed of 10 m/s. Visualize the motion of the ball.",
    "A car accelerates from rest at 2 m/s² for 5 seconds. Show the motion.",
    "A block slides down a frictionless incline at 30 degrees with initial velocity 5 m/s.",
    "Two objects collide: Object A (2 kg) moving at 3 m/s hits stationary Object B (1 kg).",
  ];

  // AI-powered problem analysis
  const analyzeProblem = async (text) => {
    setIsAnalyzing(true);
    
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          messages: [{
            role: 'user',
            content: `You are a physics problem parser. Analyze this physics problem and extract key information in JSON format.

Problem: "${text}"

Extract and return ONLY a valid JSON object with this structure:
{
  "problemType": "projectile|linear|collision|pendulum|incline",
  "objects": [{"name": "string", "mass": number, "initialPosition": {"x": number, "y": number}}],
  "parameters": {
    "initialVelocity": {"magnitude": number, "direction": "up|down|right|left", "angle": number},
    "acceleration": {"x": number, "y": number},
    "gravity": number,
    "angle": number,
    "time": number,
    "distance": number
  },
  "units": {
    "velocity": "m/s",
    "acceleration": "m/s²",
    "distance": "m",
    "mass": "kg"
  },
  "adjustableParameters": ["velocity", "gravity", "angle", "mass"],
  "description": "brief description of the scenario"
}

Return ONLY the JSON, no other text.`
          }]
        })
      });

      const data = await response.json();
      const content = data.content[0].text;
      
      // Clean and parse JSON
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        setParsedData(parsed);
        
        // Initialize simulation parameters
        const params = {
          velocity: parsed.parameters?.initialVelocity?.magnitude || 10,
          gravity: parsed.parameters?.gravity || 9.8,
          angle: parsed.parameters?.angle || 0,
          mass: parsed.objects?.[0]?.mass || 1,
          time: parsed.parameters?.time || 0
        };
        setSimulationParams(params);
        
        // Reset simulation
        setSimulationState({
          time: 0,
          position: { x: 0, y: 0 },
          velocity: { x: 0, y: 0 }
        });
      }
    } catch (error) {
      console.error('Error analyzing problem:', error);
      // Fallback to manual parsing
      setParsedData(fallbackParser(text));
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Fallback parser for demo purposes
  const fallbackParser = (text) => {
    const velocityMatch = text.match(/(\d+(?:\.\d+)?)\s*m\/s/);
    const angleMatch = text.match(/(\d+)\s*degrees?/);
    
    return {
      problemType: 'projectile',
      objects: [{ name: 'Ball', mass: 1, initialPosition: { x: 0, y: 0 } }],
      parameters: {
        initialVelocity: { 
          magnitude: velocityMatch ? parseFloat(velocityMatch[1]) : 10, 
          direction: 'up', 
          angle: angleMatch ? parseFloat(angleMatch[1]) : 90 
        },
        acceleration: { x: 0, y: -9.8 },
        gravity: 9.8
      },
      units: { velocity: 'm/s', acceleration: 'm/s²', distance: 'm', mass: 'kg' },
      adjustableParameters: ['velocity', 'gravity', 'angle'],
      description: 'Vertical projectile motion'
    };
  };

  // Physics simulation engine
  useEffect(() => {
    if (!parsedData || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    let time = 0;
    const dt = 0.016; // 60 FPS
    const scale = 20; // pixels per meter

    const animate = () => {
      // Clear canvas
      ctx.fillStyle = '#f0f4f8';
      ctx.fillRect(0, 0, width, height);

      // Draw ground
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, height - 50);
      ctx.lineTo(width, height - 50);
      ctx.stroke();

      // Calculate physics
      const v0 = simulationParams.velocity;
      const g = simulationParams.gravity;
      const angle = (simulationParams.angle || 90) * Math.PI / 180;

      const vx = v0 * Math.cos(angle);
      const vy = v0 * Math.sin(angle);

      const x = vx * time;
      const y = vy * time - 0.5 * g * time * time;

      // Convert to canvas coordinates
      const canvasX = width / 2 + x * scale;
      const canvasY = height - 50 - y * scale;

      // Draw trajectory
      ctx.strokeStyle = '#028090';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      for (let t = 0; t <= time; t += 0.1) {
        const px = width / 2 + vx * t * scale;
        const py = height - 50 - (vy * t - 0.5 * g * t * t) * scale;
        if (t === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw object (simplified as circle)
      if (y >= 0) {
        ctx.fillStyle = '#02C39A';
        ctx.strokeStyle = '#028090';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(canvasX, canvasY, 15, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Draw velocity vector
        const vxCurrent = vx;
        const vyCurrent = vy - g * time;
        const arrowScale = 3;
        ctx.strokeStyle = '#FF6B6B';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(canvasX, canvasY);
        ctx.lineTo(canvasX + vxCurrent * arrowScale, canvasY - vyCurrent * arrowScale);
        ctx.stroke();

        // Arrow head
        const arrowAngle = Math.atan2(-vyCurrent, vxCurrent);
        ctx.fillStyle = '#FF6B6B';
        ctx.beginPath();
        ctx.moveTo(canvasX + vxCurrent * arrowScale, canvasY - vyCurrent * arrowScale);
        ctx.lineTo(
          canvasX + vxCurrent * arrowScale - 10 * Math.cos(arrowAngle - Math.PI / 6),
          canvasY - vyCurrent * arrowScale + 10 * Math.sin(arrowAngle - Math.PI / 6)
        );
        ctx.lineTo(
          canvasX + vxCurrent * arrowScale - 10 * Math.cos(arrowAngle + Math.PI / 6),
          canvasY - vyCurrent * arrowScale + 10 * Math.sin(arrowAngle + Math.PI / 6)
        );
        ctx.closePath();
        ctx.fill();

        // Display info
        ctx.fillStyle = '#1E293B';
        ctx.font = '14px Arial';
        ctx.fillText(`Time: ${time.toFixed(2)}s`, 20, 30);
        ctx.fillText(`Height: ${y.toFixed(2)}m`, 20, 50);
        ctx.fillText(`Velocity: ${Math.sqrt(vxCurrent**2 + vyCurrent**2).toFixed(2)} m/s`, 20, 70);
        ctx.fillText(`Position: (${x.toFixed(2)}, ${y.toFixed(2)})m`, 20, 90);
      }

      // Update time
      time += dt;

      // Reset when object hits ground
      if (y < 0 && time > 0.1) {
        time = 0;
      }

      setSimulationState({ time, position: { x, y }, velocity: { x: vx, y: vy - g * time } });
      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [parsedData, simulationParams]);

  return (
    <div style={{ 
      maxWidth: '1400px', 
      margin: '0 auto', 
      padding: '20px',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #028090 0%, #00A896 100%)',
        color: 'white',
        padding: '40px',
        borderRadius: '12px',
        marginBottom: '30px',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
      }}>
        <h1 style={{ margin: '0 0 10px 0', fontSize: '36px', fontWeight: 'bold' }}>
          🔬 AI-Powered Physics Visualization
        </h1>
        <p style={{ margin: 0, fontSize: '18px', opacity: 0.9 }}>
          Transform text problems into interactive simulations
        </p>
      </div>

      {/* Main Content Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
        
        {/* Left Panel - Input */}
        <div>
          <div style={{
            background: 'white',
            padding: '30px',
            borderRadius: '12px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <h2 style={{ marginTop: 0, color: '#028090', fontSize: '24px' }}>
              📝 Problem Statement
            </h2>
            
            <textarea
              value={problemText}
              onChange={(e) => setProblemText(e.target.value)}
              placeholder="Enter a physics problem (e.g., 'A ball is thrown upward at 15 m/s...')"
              style={{
                width: '100%',
                height: '120px',
                padding: '15px',
                border: '2px solid #E2E8F0',
                borderRadius: '8px',
                fontSize: '16px',
                fontFamily: 'inherit',
                resize: 'vertical',
                marginBottom: '15px'
              }}
            />

            <button
              onClick={() => analyzeProblem(problemText)}
              disabled={!problemText || isAnalyzing}
              style={{
                width: '100%',
                padding: '15px',
                background: isAnalyzing ? '#CBD5E0' : '#028090',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: isAnalyzing ? 'not-allowed' : 'pointer',
                marginBottom: '20px',
                transition: 'background 0.3s'
              }}
            >
              {isAnalyzing ? '🔄 Analyzing...' : '🚀 Analyze & Visualize'}
            </button>

            <div style={{ marginTop: '20px' }}>
              <h3 style={{ fontSize: '16px', color: '#64748B', marginBottom: '10px' }}>
                Example Problems:
              </h3>
              {exampleProblems.map((example, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setProblemText(example);
                    analyzeProblem(example);
                  }}
                  style={{
                    display: 'block',
                    width: '100%',
                    padding: '10px',
                    marginBottom: '8px',
                    background: '#F0F4F8',
                    border: '1px solid #E2E8F0',
                    borderRadius: '6px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontSize: '14px',
                    color: '#1E293B',
                    transition: 'all 0.2s'
                  }}
                  onMouseOver={(e) => e.target.style.background = '#E2E8F0'}
                  onMouseOut={(e) => e.target.style.background = '#F0F4F8'}
                >
                  {example}
                </button>
              ))}
            </div>
          </div>

          {/* Extracted Parameters */}
          {parsedData && (
            <div style={{
              background: 'white',
              padding: '30px',
              borderRadius: '12px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              marginTop: '20px'
            }}>
              <h2 style={{ marginTop: 0, color: '#028090', fontSize: '24px' }}>
                🧠 AI Extraction
              </h2>
              
              <div style={{ marginBottom: '15px' }}>
                <strong style={{ color: '#1E293B' }}>Problem Type:</strong>{' '}
                <span style={{ 
                  background: '#E0F2F1', 
                  padding: '4px 12px', 
                  borderRadius: '4px',
                  color: '#028090',
                  fontWeight: 'bold'
                }}>
                  {parsedData.problemType}
                </span>
              </div>

              <div style={{ marginBottom: '15px' }}>
                <strong style={{ color: '#1E293B' }}>Description:</strong>
                <p style={{ margin: '5px 0', color: '#64748B' }}>{parsedData.description}</p>
              </div>

              <div style={{ marginBottom: '15px' }}>
                <strong style={{ color: '#1E293B' }}>Objects:</strong>
                {parsedData.objects?.map((obj, idx) => (
                  <div key={idx} style={{ 
                    marginLeft: '15px', 
                    marginTop: '5px',
                    padding: '8px',
                    background: '#F8FAFC',
                    borderRadius: '4px'
                  }}>
                    • {obj.name} {obj.mass && `(${obj.mass} kg)`}
                  </div>
                ))}
              </div>

              <div>
                <strong style={{ color: '#1E293B' }}>Key Parameters:</strong>
                <div style={{ marginLeft: '15px', marginTop: '8px' }}>
                  {Object.entries(parsedData.parameters || {}).map(([key, value]) => (
                    <div key={key} style={{ 
                      marginBottom: '5px',
                      fontSize: '14px',
                      color: '#475569'
                    }}>
                      • {key}: {typeof value === 'object' ? JSON.stringify(value) : value}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Panel - Visualization */}
        <div>
          <div style={{
            background: 'white',
            padding: '30px',
            borderRadius: '12px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <h2 style={{ marginTop: 0, color: '#028090', fontSize: '24px' }}>
              🎨 Interactive Simulation
            </h2>

            {parsedData ? (
              <>
                <canvas
                  ref={canvasRef}
                  width={600}
                  height={400}
                  style={{
                    border: '2px solid #E2E8F0',
                    borderRadius: '8px',
                    display: 'block',
                    width: '100%',
                    marginBottom: '20px'
                  }}
                />

                <div style={{ marginTop: '20px' }}>
                  <h3 style={{ fontSize: '18px', color: '#1E293B', marginBottom: '15px' }}>
                    ⚙️ Real-Time Controls
                  </h3>

                  {/* Velocity Control */}
                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between',
                      marginBottom: '8px',
                      color: '#475569',
                      fontSize: '14px',
                      fontWeight: 'bold'
                    }}>
                      <span>Initial Velocity</span>
                      <span>{simulationParams.velocity} m/s</span>
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="30"
                      step="0.5"
                      value={simulationParams.velocity}
                      onChange={(e) => setSimulationParams({
                        ...simulationParams,
                        velocity: parseFloat(e.target.value)
                      })}
                      style={{
                        width: '100%',
                        height: '8px',
                        borderRadius: '4px',
                        background: '#E2E8F0',
                        outline: 'none',
                        cursor: 'pointer'
                      }}
                    />
                  </div>

                  {/* Gravity Control */}
                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between',
                      marginBottom: '8px',
                      color: '#475569',
                      fontSize: '14px',
                      fontWeight: 'bold'
                    }}>
                      <span>Gravity</span>
                      <span>{simulationParams.gravity} m/s²</span>
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="20"
                      step="0.1"
                      value={simulationParams.gravity}
                      onChange={(e) => setSimulationParams({
                        ...simulationParams,
                        gravity: parseFloat(e.target.value)
                      })}
                      style={{
                        width: '100%',
                        height: '8px',
                        borderRadius: '4px',
                        background: '#E2E8F0',
                        outline: 'none',
                        cursor: 'pointer'
                      }}
                    />
                  </div>

                  {/* Angle Control */}
                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between',
                      marginBottom: '8px',
                      color: '#475569',
                      fontSize: '14px',
                      fontWeight: 'bold'
                    }}>
                      <span>Launch Angle</span>
                      <span>{simulationParams.angle}°</span>
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="90"
                      step="5"
                      value={simulationParams.angle}
                      onChange={(e) => setSimulationParams({
                        ...simulationParams,
                        angle: parseFloat(e.target.value)
                      })}
                      style={{
                        width: '100%',
                        height: '8px',
                        borderRadius: '4px',
                        background: '#E2E8F0',
                        outline: 'none',
                        cursor: 'pointer'
                      }}
                    />
                  </div>

                  <div style={{
                    background: '#F0F9FF',
                    padding: '15px',
                    borderRadius: '8px',
                    border: '1px solid #BAE6FD'
                  }}>
                    <p style={{ 
                      margin: 0, 
                      fontSize: '13px', 
                      color: '#0369A1',
                      lineHeight: '1.6'
                    }}>
                      💡 <strong>Tip:</strong> Adjust the parameters above to see how they affect 
                      the motion in real-time. The red arrow shows the velocity vector.
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <div style={{
                textAlign: 'center',
                padding: '80px 20px',
                color: '#94A3B8'
              }}>
                <div style={{ fontSize: '64px', marginBottom: '20px' }}>📊</div>
                <p style={{ fontSize: '18px', margin: 0 }}>
                  Enter a physics problem and click "Analyze & Visualize"
                  <br />to see the interactive simulation
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div style={{
        marginTop: '40px',
        background: 'white',
        padding: '30px',
        borderRadius: '12px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <h2 style={{ marginTop: 0, color: '#028090', fontSize: '24px', marginBottom: '25px' }}>
          ✨ System Capabilities
        </h2>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
          {[
            { icon: '🧠', title: 'AI Understanding', desc: 'Natural language processing of physics problems' },
            { icon: '🔄', title: 'Auto-Conversion', desc: 'Text to structured data transformation' },
            { icon: '🎨', title: 'Visual Generation', desc: 'Automatic creation of interactive models' },
            { icon: '⚡', title: 'Real-Time Updates', desc: 'Instant parameter manipulation' },
            { icon: '📊', title: 'Multiple Scenarios', desc: 'Explore what-if possibilities' },
            { icon: '🎯', title: 'Intuitive UI', desc: 'Easy-to-use interface for learning' }
          ].map((feature, idx) => (
            <div key={idx} style={{
              padding: '20px',
              background: '#F8FAFC',
              borderRadius: '8px',
              border: '1px solid #E2E8F0'
            }}>
              <div style={{ fontSize: '32px', marginBottom: '10px' }}>{feature.icon}</div>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', color: '#1E293B' }}>
                {feature.title}
              </h3>
              <p style={{ margin: 0, fontSize: '14px', color: '#64748B', lineHeight: '1.5' }}>
                {feature.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PhysicsVisualizationSystem;
