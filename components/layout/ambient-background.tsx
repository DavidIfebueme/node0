'use client';

import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

function Particles() {
  const particlesRef = useRef<THREE.Points>(null);
  
  const particlesCount = 80;
  const positions = new Float32Array(particlesCount * 3);
  
  for(let i = 0; i < particlesCount * 3; i++) {
    positions[i] = (Math.random() - 0.5) * 10;
  }
  
  useFrame((state, delta) => {
    if (particlesRef.current) {
      particlesRef.current.rotation.y += delta * 0.05;
      particlesRef.current.rotation.x += delta * 0.02;
    }
  });

  return (
    <points ref={particlesRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial size={0.02} color="#00e5ff" transparent opacity={0.3} sizeAttenuation />
    </points>
  );
}

function WireframeShapes() {
  const meshRef = useRef<THREE.Group>(null);
  
  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y -= delta * 0.03;
    }
  });

  return (
    <group ref={meshRef}>
      <mesh position={[-2, 1, -3]}>
        <icosahedronGeometry args={[1, 0]} />
        <meshBasicMaterial color="#e8e8ed" wireframe transparent opacity={0.03} />
      </mesh>
      <mesh position={[3, -2, -5]}>
        <octahedronGeometry args={[1.5, 0]} />
        <meshBasicMaterial color="#e8e8ed" wireframe transparent opacity={0.02} />
      </mesh>
    </group>
  );
}

export function AmbientBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none -z-10 bg-bg-primary">
      <Canvas camera={{ position: [0, 0, 5], fov: 60 }}>
        <Particles />
        <WireframeShapes />
      </Canvas>
    </div>
  );
}
