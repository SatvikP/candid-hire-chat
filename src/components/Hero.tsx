import ChatBox from './ChatBox';
import ProfileAnalyzer from './ProfileAnalyzer';

const Hero = () => {
  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Video Background */}
      <video
        className="absolute inset-0 w-full h-full object-cover z-0"
        autoPlay
        muted
        loop
        playsInline
      >
        <source
          src="https://cdn.midjourney.com/video/10e1da42-5a62-4d17-be4b-5514055728a5/1.mp4"
          type="video/mp4"
        />
      </video>

      {/* Dark Overlay */}
      <div className="absolute inset-0 video-overlay z-10" />

      {/* Navigation */}
      <nav className="relative z-30 flex justify-between items-center p-8 lg:p-12">
        <div className="text-white font-light tracking-wide text-xl">
          CandidChat
        </div>
      </nav>

      {/* Main Content */}
      <div className="relative z-20 flex flex-col min-h-screen">
        {/* Hero Text - Top Area */}
        <div className="pt-8 pb-4 px-8 lg:px-12">
          <div className="text-left animate-fade-in">
            <p className="text-white/80 text-4xl lg:text-5xl font-bold tracking-wide mb-6">
              Chat with your future talent.
            </p>
            <div className="max-w-4xl">
              <p className="text-white/90 font-bold text-3xl lg:text-4xl leading-relaxed">
                Skip the basic conversation, and deep dive already on key challenges and hire the best.
              </p>
            </div>
          </div>
        </div>

        {/* Spacer to push chat to bottom */}
        <div className="flex-1"></div>

        {/* Profile Analyzer Interface - Bottom */}
        <div className="pb-8 px-8 lg:pb-12 lg:px-12">
          <div className="w-full max-w-4xl mx-auto animate-slide-up">
            <ProfileAnalyzer />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Hero;