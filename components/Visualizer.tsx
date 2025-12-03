import React, { useEffect, useRef } from 'react';

interface VisualizerProps {
  isActive: boolean;
  volume: number; // 0 to 1
}

const Visualizer: React.FC<VisualizerProps> = ({ isActive, volume }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let angle = 0;

    const render = () => {
      // Resize
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      const { width, height } = canvas;
      const centerX = width / 2;
      const centerY = height / 2;

      ctx.clearRect(0, 0, width, height);

      if (!isActive) {
          // Draw sleeping state (pulsing circle)
          const baseRadius = 40;
          const pulse = Math.sin(Date.now() / 1000) * 5;
          
          ctx.beginPath();
          ctx.arc(centerX, centerY, baseRadius + pulse, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(148, 163, 184, 0.2)';
          ctx.fill();
          
          ctx.beginPath();
          ctx.arc(centerX, centerY, baseRadius * 0.5, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(148, 163, 184, 0.5)';
          ctx.fill();
          
          animationId = requestAnimationFrame(render);
          return;
      }

      // Active State - Organic blob shape
      const radius = 60 + (volume * 100); // React to volume
      const points = 8;
      
      ctx.beginPath();
      for (let i = 0; i <= points; i++) {
        const theta = (i / points) * Math.PI * 2;
        // Add some noise based on time and volume
        const variance = Math.sin(angle + i) * (10 + (volume * 30)); 
        const r = radius + variance;
        
        const x = centerX + Math.cos(theta) * r;
        const y = centerY + Math.sin(theta) * r;
        
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      
      ctx.closePath();
      
      // Gradient fill
      const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius + 20);
      gradient.addColorStop(0, 'rgba(236, 72, 153, 0.8)'); // Pink-500
      gradient.addColorStop(1, 'rgba(168, 85, 247, 0.4)'); // Purple-500
      
      ctx.fillStyle = gradient;
      ctx.fill();
      
      // Glow effect
      ctx.shadowBlur = 30 + (volume * 50);
      ctx.shadowColor = 'rgba(236, 72, 153, 0.6)';
      
      angle += 0.05;
      animationId = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(animationId);
  }, [isActive, volume]);

  return <canvas ref={canvasRef} className="w-full h-full" />;
};

export default Visualizer;