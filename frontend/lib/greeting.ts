export const getTimeBasedGreeting = (name?: string | null): string => {
  const hour = new Date().getHours();
  let greeting = '';

  if (hour >= 5 && hour < 12) greeting = 'Good Morning';
  else if (hour >= 12 && hour < 18) greeting = 'Good Afternoon';
  else if (hour >= 18 && hour < 22) greeting = 'Good Evening';
  else greeting = 'Good Night';

  // Use "Yeshi" as a fallback if name is not available
  const displayName = name?.split(' ')[0] || 'Yeshi';
  return `${greeting}, ${displayName}`;
};
