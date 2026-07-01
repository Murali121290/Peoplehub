import React from 'react';
import { Avatar as UIAvatar } from '../../../components/ui/Avatar';

interface AvatarProps {
  initials: string;
  size?: number;
}

const Avatar: React.FC<AvatarProps> = ({ initials, size = 36 }) => (
  <UIAvatar initials={initials} size={size} colorSeed={initials} />
);

export default Avatar;
