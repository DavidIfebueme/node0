'use client';

import React, { useRef, useMemo, useState, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { Text, Line } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';

type AnimState = 'idle' | 'breaching' | 'tracing' | 'exposed' | 'reassembling';

const NODE_COUNT = 45;
const EDGE_DISTANCE = 1.2;
const LABELS = ['ORIGIN', 'TRACE', 'VENDOR', 'BLAST', 'PROSPECT', 'NODE0'];

function fibonacciSphere(n: number, radius: number): THREE.Vector3[] {
  const points: THREE.Vector3[] = [];
  const goldenRatio = (1 + Math.sqrt(5)) / 2;
  for (let i = 0; i < n; i++) {
    const theta = 2 * Math.PI * i / goldenRatio;
    const phi = Math.acos(1 - 2 * (i + 0.5) / n);
    points.push(new THREE.Vector3(
      radius * Math.sin(phi) * Math.cos(theta),
      radius * Math.sin(phi) * Math.sin(theta),
      radius * Math.cos(phi)
    ));
  }
  return points;
}

function ZeroNode() {
  const groupRef = useRef<THREE.Group>(null);
  const [animState, setAnimState] = useState<AnimState>('idle');
  const animTime = useRef(0);
  const nodeRefs = useRef<THREE.Mesh[]>([]);
  const { viewport } = useThree();

  const originalPositions = useMemo(() => fibonacciSphere(NODE_COUNT, 1.8), []);
  const targetPositions = useRef<THREE.Vector3[]>(originalPositions.map(p => p.clone()));
  const currentPositions = useRef<THREE.Vector3[]>(originalPositions.map(p => p.clone()));
  const nodeColors = useRef<string[]>(Array(NODE_COUNT).fill('#e8e8ed'));
  const nodeOpacities = useRef<number[]>(Array(NODE_COUNT).fill(0.6));
  const nodeScales = useRef<number[]>(Array(NODE_COUNT).fill(1));

  const edges = useMemo(() => {
    const e: [number, number][] = [];
    for (let i = 0; i < NODE_COUNT; i++) {
      for (let j = i + 1; j < NODE_COUNT; j++) {
        if (originalPositions[i].distanceTo(originalPositions[j]) < EDGE_DISTANCE) {
          e.push([i, j]);
        }
      }
    }
    return e;
  }, [originalPositions]);

  const edgeOpacities = useRef<number[]>(Array(edges.length).fill(0.2));

  const centerNodeIndex = useMemo(() => {
    let closest = 0;
    let minDist = Infinity;
    originalPositions.forEach((p, i) => {
      const d = p.length();
      if (d < minDist) {
        minDist = d;
        closest = i;
      }
    });
    return closest;
  }, [originalPositions]);

  const prospectIndices = useMemo(() => {
    const indices: number[] = [];
    const outerNodes = originalPositions
      .map((p, i) => ({ i, d: p.length() }))
      .filter(x => x.d > 2.0)
      .sort((a, b) => b.d - a.d);
    for (let k = 0; k < Math.min(5, outerNodes.length); k++) {
      indices.push(outerNodes[k].i);
    }
    return indices;
  }, [originalPositions]);

  const connectedToCenter = useMemo(() => {
    return edges
      .filter(([a, b]) => a === centerNodeIndex || b === centerNodeIndex)
      .map(([a, b]) => a === centerNodeIndex ? b : a);
  }, [edges, centerNodeIndex]);

  const handleClick = useCallback(() => {
    if (animState !== 'idle') return;
    setAnimState('breaching');
    animTime.current = 0;
  }, [animState]);

  useFrame((state, delta) => {
    if (!groupRef.current) return;

    groupRef.current.rotation.y += delta * 0.05;

    if (animState === 'idle') {
      const t = state.clock.elapsedTime;
      groupRef.current.position.y = Math.sin(t * 0.5) * 0.1;
      return;
    }

    animTime.current += delta;

    if (animState === 'breaching' && animTime.current > 0.5) {
      setAnimState('tracing');
      animTime.current = 0;
    }

    if (animState === 'tracing') {
      nodeColors.current[centerNodeIndex] = '#ff2d4a';
      nodeScales.current[centerNodeIndex] = 2;

      connectedToCenter.forEach(idx => {
        if (animTime.current > 0.3) {
          nodeColors.current[idx] = '#ff8a00';
          const dir = currentPositions.current[idx].clone().normalize();
          targetPositions.current[idx] = originalPositions[idx].clone().add(dir.multiplyScalar(2));
        }
      });

      if (animTime.current > 1.0) {
        prospectIndices.forEach(idx => {
          nodeColors.current[idx] = '#00e5ff';
          nodeScales.current[idx] = 1.5;
          const dir = currentPositions.current[idx].clone().normalize();
          targetPositions.current[idx] = originalPositions[idx].clone().add(dir.multiplyScalar(3));
        });

        edges.forEach(([a, b], ei) => {
          if (a === centerNodeIndex || b === centerNodeIndex) {
            edgeOpacities.current[ei] = Math.max(0, edgeOpacities.current[ei] - delta * 0.5);
          }
        });
      }

      if (animTime.current > 2.0) {
        setAnimState('exposed');
        animTime.current = 0;
      }
    }

    if (animState === 'exposed') {
      if (animTime.current > 2.0) {
        setAnimState('reassembling');
        animTime.current = 0;
        targetPositions.current = originalPositions.map(p => p.clone());
        nodeColors.current = Array(NODE_COUNT).fill('#e8e8ed');
        nodeScales.current = Array(NODE_COUNT).fill(1);
        edgeOpacities.current = Array(edges.length).fill(0.2);
      }
    }

    if (animState === 'reassembling') {
      if (animTime.current > 2.0) {
        setAnimState('idle');
        animTime.current = 0;
      }
    }

    currentPositions.current.forEach((pos, i) => {
      pos.lerp(targetPositions.current[i], delta * 1.5);
      if (nodeRefs.current[i]) {
        nodeRefs.current[i].position.copy(pos);
        nodeRefs.current[i].scale.setScalar(nodeScales.current[i]);
      }
    });
  });

  return (
    <group ref={groupRef} onClick={handleClick}>
      {originalPositions.map((pos, i) => (
        <mesh
          key={i}
          ref={(el) => { if (el) nodeRefs.current[i] = el; }}
          position={currentPositions.current[i]}
        >
          <sphereGeometry args={[0.06, 8, 8]} />
          <meshBasicMaterial color={nodeColors.current[i]} transparent opacity={0.6} />
        </mesh>
      ))}

      {edges.map(([a, b], i) => {
        const startPos = currentPositions.current[a];
        const endPos = currentPositions.current[b];
        return (
          <Line
            key={`e-${i}`}
            points={[startPos.toArray(), endPos.toArray()]}
            color="#00e5ff"
            lineWidth={0.5}
            transparent
            opacity={edgeOpacities.current[i]}
          />
        );
      })}

      {LABELS.map((label, i) => {
        const angle = (i / LABELS.length) * Math.PI * 2;
        const r = 3.2;
        return (
          <Text
            key={label}
            position={[Math.cos(angle) * r, Math.sin(angle * 0.7) * 0.8, Math.sin(angle) * r * 0.5]}
            fontSize={0.15}
            color="#6b6b7a"
            anchorX="center"
            anchorY="middle"
            font="/fonts/JetBrainsMono-Regular.woff2"
          >
            {label}
          </Text>
        );
      })}
    </group>
  );
}

export function HeroScene() {
  return (
    <div className="w-full h-full cursor-pointer">
      <Canvas camera={{ position: [0, 0, 6], fov: 50 }}>
        <ZeroNode />
        <EffectComposer>
          <Bloom luminanceThreshold={0.2} luminanceSmoothing={0.9} intensity={0.8} />
        </EffectComposer>
      </Canvas>
    </div>
  );
}
