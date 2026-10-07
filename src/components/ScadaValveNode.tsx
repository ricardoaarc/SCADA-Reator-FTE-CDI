import React, { useState, useRef } from 'react';
import { ValvulaMotorizadaInfo } from '../types';

interface ScadaValveNodeProps {
  valvula: ValvulaMotorizadaInfo | undefined;
  tagDefault: string;
  x: number;
  y: number;
  rotacaoDeg?: number;
  tipoVisual?: 'BORBOLETA' | 'ESFERA';
  onClick: (tag: string) => void;
  labelPosition?: 'DEFAULT' | 'ACIMA' | 'ABAIXO';
}

/**
 * ScadaValveNode — Componente Industrial de Válvula SCADA de Alta Performance (ANSI/ISA-101 & ISA-5.1)
 * 
 * Arquitetura de 4 Subcamadas Isoladas com Extirpação Total de Tremor (Hover Jitter Loop):
 * 1. Subcamada 1: Símbolo P&ID (Ampulheta / Esfera) passivo a eventos (pointer-events: none);
 * 2. Subcamada 2: Tag Plate com contraste elevado e tipografia monoespaçada (pointer-events: none);
 * 3. Subcamada 3: Anel de Foco / Halo Concêntrico acionado por opacidade estática (zero CSS scale);
 * 4. Subcamada 4: Hitbox Ativa Quadrada Blindada (48x48 px, fill="rgba(0,0,0,0.001)", pointer-events: all).
 */
export const ScadaValveNode: React.FC<ScadaValveNodeProps> = ({
  valvula,
  tagDefault,
  x,
  y,
  rotacaoDeg = 0,
  tipoVisual = 'BORBOLETA',
  onClick,
  labelPosition = 'DEFAULT'
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const clickLockRef = useRef<number>(0);

  const tag = valvula?.tag || tagDefault;
  const estado = valvula?.estado || 'FECHADA';
  const aberturaPct = valvula?.posicaoAberturaPct ?? (estado === 'ABERTA' ? 100 : 0);

  // Cores semafóricas normalizadas ISA-101
  let corCorpo = '#ef4444'; // Vermelho (Fechada)
  let statusBg = '#450a0a';
  let statusBorder = '#ef4444';
  let statusTexto = '#fca5a5';
  let labelEstado = 'FECHADA';

  if (estado === 'ABERTA') {
    corCorpo = '#10b981'; // Verde Esmeralda (Aberta)
    statusBg = '#064e3b';
    statusBorder = '#10b981';
    statusTexto = '#6ee7b7';
    labelEstado = aberturaPct === 100 ? 'ABERTA' : `${aberturaPct}%`;
  } else if (estado === 'TRANSITANDO') {
    corCorpo = '#f59e0b'; // Âmbar (Transitando)
    statusBg = '#451a03';
    statusBorder = '#f59e0b';
    statusTexto = '#fde68a';
    labelEstado = `${aberturaPct}% ⚙️`;
  } else if (estado === 'FALHA_TORQUE' || estado === 'INTERTRAVADA') {
    corCorpo = '#a855f7'; // Roxo Magenta (Intertravamento)
    statusBg = '#3b0764';
    statusBorder = '#a855f7';
    statusTexto = '#f5d0fe';
    labelEstado = 'INTERLOCK';
  }

  // Tratamento de clique com debounce de 300ms (trava de concorrência)
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const now = Date.now();
    if (now - clickLockRef.current < 300) return;
    clickLockRef.current = now;
    onClick(tag);
  };

  return (
    <g 
      transform={`translate(${x}, ${y})`}
      className="select-none"
    >
      {/* =================================================================== */}
      {/* CAMADA 3: ANEL DE FOCO ESTÁTICO (HALO GLOW - ZERO TRANSFORM)        */}
      {/* =================================================================== */}
      <circle 
        cx="0" 
        cy="0" 
        r="22" 
        fill="none" 
        stroke="#38bdf8" 
        strokeWidth="2" 
        strokeDasharray="4 4"
        pointerEvents="none"
        opacity={isHovered ? 1 : 0}
        style={{ transition: 'opacity 0.15s ease' }}
        className="animate-[spin_6s_linear_infinite]"
      />

      {/* =================================================================== */}
      {/* CAMADA 1: SÍMBOLO MECÂNICO P&ID (POINTER-EVENTS: NONE)              */}
      {/* =================================================================== */}
      <g 
        transform={`rotate(${rotacaoDeg})`} 
        pointerEvents="none"
      >
        {tipoVisual === 'BORBOLETA' ? (
          <>
            {/* Ampulheta Normalizada P&ID */}
            <polygon 
              points="-11,-11 11,11 11,-11 -11,11" 
              fill={corCorpo} 
              stroke="#ffffff" 
              strokeWidth="1.4" 
              strokeLinejoin="round"
            />
            {/* Haste do Atuador Motorizado */}
            <line x1="0" y1="0" x2="0" y2="-15" stroke="#94a3b8" strokeWidth="1.5" />
            <circle cx="0" cy="-17" r="3.5" fill="#1e293b" stroke="#38bdf8" strokeWidth="1.2" />
          </>
        ) : (
          <>
            {/* Válvula de Esfera P&ID */}
            <polygon 
              points="-11,-11 11,11 11,-11 -11,11" 
              fill={corCorpo} 
              stroke="#ffffff" 
              strokeWidth="1.4" 
              strokeLinejoin="round"
            />
            <circle cx="0" cy="0" r="4.5" fill="#0f172a" stroke="#ffffff" strokeWidth="1.2" />
            <line x1="0" y1="0" x2="0" y2="-15" stroke="#94a3b8" strokeWidth="1.5" />
            <rect x="-4" y="-20" width="8" height="6" rx="1.5" fill="#38bdf8" />
          </>
        )}
      </g>

      {/* =================================================================== */}
      {/* CAMADA 2: TAG PLATE INDUSTRIAL ANSI/ISA-5.1 (POINTER-EVENTS: NONE)  */}
      {/* =================================================================== */}
      <g pointerEvents="none">
        {/* Cabeçalho de TAG */}
        <rect 
          x="-28" 
          y={labelPosition === 'ABAIXO' ? 14 : -35} 
          width="56" 
          height="14" 
          rx="3" 
          fill="#090d16" 
          stroke={isHovered ? "#38bdf8" : "#475569"} 
          strokeWidth={isHovered ? "1.2" : "0.8"} 
        />
        <text 
          x="0" 
          y={labelPosition === 'ABAIXO' ? 24.5 : -24.5} 
          fill={isHovered ? "#38bdf8" : "#f8fafc"} 
          fontSize="7.5" 
          fontWeight="bold" 
          fontFamily="monospace"
          textAnchor="middle"
        >
          {tag}
        </text>

        {/* Rodapé de Estado Semafórico e Abertura % */}
        <rect 
          x="-26" 
          y={labelPosition === 'ABAIXO' ? 29 : 14} 
          width="52" 
          height="12" 
          rx="2" 
          fill={statusBg} 
          stroke={statusBorder} 
          strokeWidth="0.8" 
        />
        <text 
          x="0" 
          y={labelPosition === 'ABAIXO' ? 38 : 23} 
          fill={statusTexto} 
          fontSize="6.5" 
          fontWeight="bold" 
          fontFamily="monospace"
          textAnchor="middle"
        >
          {labelEstado}
        </text>
      </g>

      {/* =================================================================== */}
      {/* CAMADA 4: HITBOX ATIVA BLINDADA (CAPTURA EXCLUSIVA DE EVENTOS)     */}
      {/* =================================================================== */}
      {/* 
        Atenção Arquitetural: Preenchimento com rgba(0,0,0,0.001) força o compositor 
        Chromium/Gecko a instanciar uma superfície rígida de colisão de 48x48 px, 
        evitando perda de clique nas zonas vazias do polígono e blindando os textos.
      */}
      <rect 
        x="-24" 
        y="-24" 
        width="48" 
        height="48" 
        fill="rgba(0,0,0,0.001)" 
        pointerEvents="all" 
        className="cursor-pointer"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={handleClick}
      />
    </g>
  );
};
