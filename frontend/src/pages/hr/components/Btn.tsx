import React from 'react';
import { Button } from '../../../components/ui/Button';

interface BtnProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary';
  style?: React.CSSProperties;
}

const Btn: React.FC<BtnProps> = ({ children, onClick, variant = 'primary', style }) => (
  <Button
    variant={variant === 'primary' ? 'primary' : 'outline'}
    onClick={onClick}
    style={style}
  >
    {children}
  </Button>
);

export default Btn;
