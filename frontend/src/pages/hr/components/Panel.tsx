import React from 'react';
import { Card } from '../../../components/ui/Card';

interface PanelProps {
  children: React.ReactNode;
  style?: React.CSSProperties;
}

const Panel: React.FC<PanelProps> = ({ children, style }) => (
  <Card padding="lg" style={style}>
    {children}
  </Card>
);

export default Panel;
