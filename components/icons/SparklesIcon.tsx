
import React from 'react';

interface IconProps extends React.SVGProps<SVGSVGElement> {}

export const SparklesIcon: React.FC<IconProps> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L1.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.25 12L17 13.75M18.25 12L19.5 10.25M18.25 12L17 10.25M18.25 12L19.5 13.75M12 3.25L10.25 4.5M12 3.25L13.75 4.5M12 3.25L10.25 2M12 3.25L13.75 2M12 20.75L10.25 19.5M12 20.75L13.75 19.5M12 20.75L10.25 22M12 20.75L13.75 22M3.25 12L4.5 13.75M3.25 12L2 10.25M3.25 12L4.5 10.25M3.25 12L2 13.75" />
  </svg>
);
    