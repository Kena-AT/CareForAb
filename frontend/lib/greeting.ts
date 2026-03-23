export const getTimeBasedGreeting = (name?: string | null): string => {
  const hour = new Date().getHours();
  let greeting = '';

  if (hour < 12) greeting = 'Good Morning';
  else if (hour < 18) greeting = 'Good Afternoon';
  else greeting = 'Good Evening';

  return name ? `${greeting}, ${name.split(' ')[0]}` : greeting;
};
