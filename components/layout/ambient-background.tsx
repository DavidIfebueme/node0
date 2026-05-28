'use client';

import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

function Particles() {
  const particlesRef = useRef<THREE.Points>(null);

  const particlesCount = 80;
  const positions = useMemo(() => {
    const pos = new Float32Array(particlesCount * 3);
    for (let i = 0; i < particlesCount * 3; i++) {
      pos[i] = (Math.random() - 0.5) * 10;
    }
    return pos;
  }, []);

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

interface DataStream {
  id: number;
  start: THREE.Vector3;
  end: THREE.Vector3;
  progress: number;
  speed: number;
  opacity: number;
}

function DataStreams() {
  const streamsRef = useRef<DataStream[]>([]);
  const nextId = useRef(0);
  const linesRef = useRef<THREE.Group>(null);
  const { viewport } = useThree();

  const spawnStream = () => {
    const w = viewport.width;
    const h = viewport.height;
    const side = Math.random();

    let start: THREE.Vector3;
    let end: THREE.Vector3;

    if (side < 0.5) {
      start = new THREE.Vector3(-w / 2 - 1, (Math.random() - 0.5) * h, -2);
      end = new THREE.Vector3(w / 2 + 1, (Math.random() - 0.5) * h, -2);
    } else {
      start = new THREE.Vector3((Math.random() - 0.5) * w, -h / 2 - 1, -2);
      end = new THREE.Vector3((Math.random() - 0.5) * w, h / 2 + 1, -2);
    }

    return {
      id: nextId.current++,
      start,
      end,
      progress: 0,
      speed: 0.3 + Math.random() * 0.3,
      opacity: 0,
    };
  };

  useFrame((state, delta) => {
    if (Math.random() < delta * 0.15) {
      streamsRef.current.push(spawnStream());
    }

    streamsRef.current = streamsRef.current.filter(s => {
      s.progress += delta * s.speed;

      if (s.progress < 0.2) {
        s.opacity = s.progress / 0.2 * 0.08;
      } else if (s.progress > 0.8) {
        s.opacity = (1 - s.progress) / 0.2 * 0.08;
      } else {
        s.opacity = 0.08;
      }

      return s.progress < 1;
    });

    if (linesRef.current) {
      while (linesRef.current.children.length > 0) {
        linesRef.current.remove(linesRef.current.children[0]);
      }

      streamsRef.current.forEach(s => {
        const currentPos = new THREE.Vector3().lerpVectors(s.start, s.end, s.progress);
        const tailProgress = Math.max(0, s.progress - 0.15);
        const tailPos = new THREE.Vector3().lerpVectors(s.start, s.end, tailProgress);

        const geometry = new THREE.BufferGeometry().setFromPoints([tailPos, currentPos]);
        const material = new THREE.LineBasicMaterial({
          color: '#00e5ff',
          transparent: true,
          opacity: s.opacity,
        });
        const line = new THREE.Line(geometry, material);
        linesRef.current!.add(line);
      });
    }
  });

  return <group ref={linesRef} />;
}

export function AmbientBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none -z-10 bg-bg-primary">
      <Canvas camera={{ position: [0, 0, 5], fov: 60 }}>
        <Particles />
        <WireframeShapes />
        <DataStreams />
      </Canvas>
    </div>
  );
}
