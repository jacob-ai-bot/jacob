import FlickeringGrid from "../_components/magicui/flickering-grid";

const LoadingPage: React.FC = () => {
  return (
    <div className="relative flex h-screen w-full flex-col items-center justify-center  bg-gradient-to-br from-aurora-50 to-blossom-50 align-middle text-dark-blue  dark:from-slate-900 dark:to-slate-800 dark:text-slate-100">
      <div className="z-10 flex flex-col space-y-6 rounded-2xl bg-white/30 p-12 dark:bg-slate-900/30">
        <h1 className="font-crimson text-4xl font-bold tracking-tight text-aurora-900 dark:text-slate-100">
          Loading...
        </h1>
        <div className="flex flex-row items-center justify-center space-x-2  ">
          <div className="h-8 w-8 animate-bounce rounded-full bg-[#BBDEFB] [animation-delay:-0.3s] dark:bg-[#B2EBF2]"></div>
          <div className="h-8 w-8 animate-bounce rounded-full bg-[#FFCCBC] [animation-delay:-0.15s] dark:bg-[#D1C4E9]"></div>
          <div className="h-8 w-8 animate-bounce rounded-full bg-[#B2DFDB] dark:bg-[#E0E7FF]"></div>
        </div>
      </div>
      <FlickeringGrid
        className="absolute inset-0 z-0"
        color="#58dbd0"
        maxOpacity={0.2}
      />
    </div>
  );
};

export default LoadingPage;
