import React from 'react';
import Community from './Community';

const Home = () => {
  const banner = {
    frontpage: [
      { title: 'r/programming', url: 'https://www.reddit.com/r/programming' },
      { title: 'r/AskReddit', url: 'https://www.reddit.com/r/AskReddit' },
      { title: 'r/gaming', url: 'https://www.reddit.com/r/gaming' },
    ],
  };

  return (
    <div className="app">
      <Community banner={banner} />
    </div>
  );
};

export default Home;
