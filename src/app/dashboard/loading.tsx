const LoadingPage: React.FC = () => {
  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-dark-blue text-white">
      <div className="flex h-screen flex-col items-center justify-center space-y-8 dark:invert">
        <h1 className="text-white">Loading</h1>
        <div className="flex flex-row items-center justify-center space-x-2  ">
          <div className="h-8 w-8 animate-bounce rounded-full bg-light-blue [animation-delay:-0.3s]"></div>
          <div className="h-8 w-8 animate-bounce rounded-full bg-pink [animation-delay:-0.15s]"></div>
          <div className="h-8 w-8 animate-bounce rounded-full bg-orange"></div>
        </div>
      </div>
    </div>
  );
};

export default LoadingPage;
