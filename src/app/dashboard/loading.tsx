const LoadingPage: React.FC = () => {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center  text-white">
      <div className="flex h-screen flex-col items-center justify-center space-y-8 dark:invert">
        <h1 className="text-white">Loading</h1>
        <div className="flex flex-row items-center justify-center space-x-2  ">
          <div className="bg-light-blue h-8 w-8 animate-bounce rounded-full [animation-delay:-0.3s]"></div>
          <div className="bg-pink h-8 w-8 animate-bounce rounded-full [animation-delay:-0.15s]"></div>
          <div className="bg-orange h-8 w-8 animate-bounce rounded-full"></div>
        </div>
      </div>
    </div>
  );
};

export default LoadingPage;
