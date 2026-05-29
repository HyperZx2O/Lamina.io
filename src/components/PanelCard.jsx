import React from 'react';
import { motion } from 'framer-motion';

export default function PanelCard({ children, color = '#9cc4b2' }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.36 }} style={{ marginTop: 28 }}>
      <div style={{ height: 3, background: `linear-gradient(90deg, ${color}, ${color}20, transparent)`, borderRadius: '3px 3px 0 0', transition: 'background 0.3s ease' }} />
      <div style={{
        background: "#242120",
        border: "1px solid #3a3634",
        borderTop: "none",
        borderRadius: "0 0 16px 16px",
        padding: "28px 28px 32px",
        boxShadow: "0 8px 40px rgba(0,0,0,.35)",
      }}>
        {children}
      </div>
    </motion.div>
  );
}
