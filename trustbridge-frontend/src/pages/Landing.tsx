import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import Button from '../components/UI/Button';
import { ArrowRight, TrendingUp, Shield, Globe, Users, Zap, Star, CheckCircle, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';
import AnimatedBackground from '../components/UI/AnimatedBackground';
import AuthStatus from '../components/Auth/AuthStatus';

const Landing: React.FC = () => {
  console.log('Landing page rendered - user was redirected here');
  const [mousePosition, setMousePosition] = useState({ x: 50, y: 50 });
  const heroSectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (heroSectionRef.current) {
        const rect = heroSectionRef.current.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        setMousePosition({ x, y });
      }
    };

    const heroSection = heroSectionRef.current;
    if (heroSection) {
      heroSection.addEventListener('mousemove', handleMouseMove);
      return () => {
        heroSection.removeEventListener('mousemove', handleMouseMove);
      };
    }
  }, []);
  const features = [
    {
      icon: TrendingUp,
      title: 'Real World Asset Tokenization',
      description: 'Tokenize real-world assets including real estate, farms, commodities, infrastructure, and more into digital tokens'
    },
    {
      icon: Shield,
      title: 'Mantle + IPFS Technology',
      description: 'EVM-compatible Layer 2, low gas fees, high throughput - modular blockchain infrastructure'
    },
    {
      icon: Globe,
      title: 'Trust Token Economy',
      description: 'Custom TRUST tokens for payments, MNT for gas - predictable, low-cost trading'
    },
    {
      icon: Users,
      title: 'Decentralized Marketplace',
      description: 'Peer-to-peer trading with IPFS metadata, Mirror Node verification, and immutable records'
    }
  ];

  const stats = [
    { label: 'Transaction Speed', value: '< 2 seconds', change: 'Mantle L2' },
    { label: 'Transaction Cost', value: 'Low fees', change: 'Layer 2 scaling' },
    { label: 'Asset Types', value: 'Unlimited', change: 'Universal' },
    { label: 'Storage', value: 'IPFS', change: 'Decentralized' }
  ];

  const steps = [
    {
      number: '01',
      title: 'Connect & Browse',
      description: 'Connect your wallet and browse tokenized real-world assets available for investment'
    },
    {
      number: '02',
      title: 'Submit Real World Asset',
      description: 'Submit your real-world asset (farm, property, commodity) for professional verification and tokenization'
    },
    {
      number: '03',
      title: 'Get Verified',
      description: 'AMC professionals verify and approve your real-world asset for tokenization'
    },
    {
      number: '04',
      title: 'Tokenize & Trade',
      description: 'Your asset is tokenized and investors worldwide can purchase tokens representing ownership'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 text-black relative overflow-hidden">
      {/* Animated Background */}
      <AnimatedBackground />

      <div className="relative z-10">
        {/* Navigation */}
        <nav className="flex items-center justify-between p-4 sm:p-6 lg:p-8">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-black triangle floating"></div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-black">TrustBridge</h1>
              <p className="text-xs text-black uppercase tracking-wider">Africa</p>
            </div>
          </div>
          
          {/* Desktop Navigation Menu */}
          <div className="hidden lg:flex items-center gap-6 xl:gap-8">
            <a href="#assets" className="text-black hover:text-gray-600 transition-colors text-sm xl:text-base">Assets</a>
            <a href="#communities" className="text-black hover:text-gray-600 transition-colors text-sm xl:text-base">Communities</a>
            <a href="#features" className="text-black hover:text-gray-600 transition-colors text-sm xl:text-base">Features</a>
            <a href="#how-it-works" className="text-black hover:text-gray-600 transition-colors text-sm xl:text-base">How It Works</a>
            <Link to="/documentation">
              <span className="text-black hover:text-gray-600 transition-colors text-sm xl:text-base cursor-pointer">Docs</span>
            </Link>
            <Link to="/dashboard">
              <Button variant="neon" size="sm">Launch App</Button>
            </Link>
          </div>

          {/* Tablet Navigation */}
          <div className="hidden md:flex lg:hidden items-center gap-3">
            <Link to="/dashboard">
              <Button variant="neon" size="sm">Launch App</Button>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center gap-2">
            <Link to="/dashboard">
              <Button variant="neon" size="sm">Launch App</Button>
            </Link>
          </div>
        </nav>

        {/* Hero Section */}
        <section 
          ref={heroSectionRef}
          className="relative px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20 min-h-screen flex items-center"
        >
          {/* Hero Background Image */}
          <div className="absolute inset-0 z-0 overflow-hidden">
            {/* Grayscale version - base layer (always visible) */}
            <img
              src="/images/countryside-people-out-field-together.jpg"
              alt="African farmers working together"
              className="w-full h-full object-cover grayscale contrast-110"
            />
            {/* Colorful version - revealed by mask where cursor is */}
            <div 
              className="absolute inset-0 w-full h-full pointer-events-none"
              style={{
                backgroundImage: 'url(/images/countryside-people-out-field-together.jpg)',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                filter: 'contrast(110%) saturate(1.2)',
                maskImage: `radial-gradient(circle 500px at ${mousePosition.x}% ${mousePosition.y}%, black 0%, black 60%, transparent 75%)`,
                WebkitMaskImage: `radial-gradient(circle 500px at ${mousePosition.x}% ${mousePosition.y}%, black 0%, black 60%, transparent 75%)`,
                mixBlendMode: 'normal',
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-white/80 via-white/60 to-white/40"></div>
            <div className="absolute inset-0 bg-gradient-to-t from-white/90 via-transparent to-transparent"></div>
            
            {/* Floating Elements */}
            <div className="absolute top-20 right-20 w-32 h-32 border border-black/10 rounded-full opacity-60 rotating"></div>
            <div className="absolute bottom-32 left-16 w-24 h-24 border border-black/10 rounded-full opacity-40 rotating" style={{ animationDirection: 'reverse' }}></div>
            <div className="absolute top-1/3 right-1/4 w-6 h-6 bg-black rounded-full opacity-70 floating"></div>
            <div className="absolute bottom-1/3 left-1/3 w-4 h-4 bg-black rounded-full opacity-60 floating" style={{ animationDelay: '2s' }}></div>
            <div className="absolute top-2/3 right-1/3 w-20 h-20 border border-black/10 morphing-shape opacity-30"></div>
          </div>
          
          <div className="relative z-10 max-w-7xl mx-auto w-full">
            <motion.div
              className="text-center mb-16"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <motion.div
                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 border border-gray-200 rounded-full mb-8"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2, duration: 0.5 }}
              >
                <Zap className="w-4 h-4 text-black" />
                <span className="text-sm font-semibold text-black uppercase tracking-wider">Live on Mantle</span>
              </motion.div>

              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold mb-4 sm:mb-6 leading-tight">
                <motion.span 
                  className="block text-black"
                  initial={{ opacity: 0, y: 50 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.6 }}
                >
                  TOKENIZE
                </motion.span>
                <motion.span 
                  className="block text-black"
                  initial={{ opacity: 0, y: 50 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4, duration: 0.6 }}
                >
                  REAL WORLD
                </motion.span>
                <motion.span 
                  className="block text-black font-extrabold"
                  initial={{ opacity: 0, y: 50 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5, duration: 0.6 }}
                >
                  ASSETS
                </motion.span>
              </h1>

              <motion.p 
                className="text-base sm:text-lg md:text-xl lg:text-2xl text-gray-700 max-w-4xl mx-auto mb-8 sm:mb-10 lg:mb-12 leading-relaxed px-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, duration: 0.6 }}
              >
                Transform real-world assets into digital tokens on Mantle blockchain. 
                <span className="text-black font-bold"> TrustBridge</span> enables you to tokenize farms, real estate, commodities, and infrastructure - making them accessible for global investment with EVM-compatibility and low gas fees.
              </motion.p>

              <motion.div
                className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center px-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7, duration: 0.6 }}
              >
                <Link to="/dashboard">
                  <Button variant="primary" size="lg" className="group w-full sm:w-auto">
                    Launch App
                    <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
                <Link to="/dashboard/marketplace">
                  <Button variant="outline" size="lg" className="group w-full sm:w-auto">
                    Browse Assets
                    <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
              </motion.div>
            </motion.div>

            {/* Live Stats */}
            <motion.div
              className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 mb-12 sm:mb-16 lg:mb-20 px-4"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.8 }}
            >
              {stats.map((stat, index) => (
                <motion.div
                  key={stat.label}
                  className="text-center p-4 sm:p-6 bg-white/80 backdrop-blur-md rounded-xl border border-gray-200 hover:border-gray-300 transition-all duration-300 hover:scale-105"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.9 + index * 0.1, duration: 0.5 }}
                >
                  <h3 className="text-2xl sm:text-3xl font-bold text-black mb-1 sm:mb-2">{stat.value}</h3>
                  <p className="text-xs sm:text-sm text-gray-600 mb-1">{stat.label}</p>
                  <p className="text-xs text-black font-semibold">{stat.change}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* African Assets Showcase */}
        <section id="assets" className="px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20 bg-gray-50 relative z-10">
          <div className="max-w-7xl mx-auto">
            <motion.div
              className="text-center mb-16"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <h2 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold mb-4 sm:mb-6">
                <span className="text-black">REAL AFRICAN</span>
                <br />
                <span className="text-black">ASSETS</span>
              </h2>
              <p className="text-lg sm:text-xl text-gray-700 max-w-3xl mx-auto px-4">
                Discover tokenized African farms, properties, and infrastructure assets available for global investment.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
              {[
                {
                  title: 'Maize Farm - Kenya',
                  location: 'Nyeri County, Kenya',
                  value: '$2.4M',
                  image: '/images/countryside-workers-together-field.jpg',
                  type: 'Agriculture',
                  tokenized: true,
                  investors: 47
                },
                {
                  title: 'Coffee Plantation - Mount Kenya',
                  location: 'Mount Kenya Region',
                  value: '$5.8M',
                  image: '/images/1trs.jpeg',
                  type: 'Agriculture',
                  tokenized: true,
                  investors: 89
                },
                {
                  title: 'Commercial Building - Lagos',
                  location: 'Victoria Island, Nigeria',
                  value: '$12.5M',
                  image: '/images/2trs.jpg',
                  type: 'Real Estate',
                  tokenized: true,
                  investors: 156
                },
                {
                  title: 'Solar Farm - South Africa',
                  location: 'Northern Cape',
                  value: '$18.7M',
                  image: '/images/3trs.webp',
                  type: 'Infrastructure',
                  tokenized: true,
                  investors: 234
                }
              ].map((asset, index) => (
                <motion.div
                  key={asset.title}
                  className="group cursor-pointer"
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + index * 0.1, duration: 0.6 }}
                  whileHover={{ y: -5 }}
                >
                  <div className="relative overflow-hidden rounded-xl bg-white border-2 border-gray-200 hover:border-gray-300 transition-all duration-300 transform hover:-translate-y-1 shadow-sm">
                    {/* Image */}
                    <div className="aspect-video relative overflow-hidden">
                      <img
                        src={asset.image}
                        alt={asset.title}
                        className="w-full h-full object-cover grayscale contrast-110 group-hover:scale-105 group-hover:grayscale-0 transition-all duration-300"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                      
                      {/* Type Badge */}
                      <div className="absolute top-3 left-3 z-10">
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-white text-black border border-gray-300">
                          <span className="text-lg">
                            {asset.type === 'Agriculture' ? '🌾' : 
                             asset.type === 'Real Estate' ? '🏢' : 
                             asset.type === 'Infrastructure' ? '⚡' : '📦'}
                          </span>
                          {asset.type}
                        </span>
                      </div>

                      {/* Tokenized Badge */}
                      {asset.tokenized && (
                        <div className="absolute top-3 right-3 z-10">
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-900 text-white border-2 border-gray-600">
                            <Shield className="w-3 h-3" />
                            Tokenized
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="p-4 bg-white">
                      <h3 className="font-semibold text-black mb-2 group-hover:text-gray-800 transition-colors">
                        {asset.title}
                      </h3>
                      
                      <div className="flex items-center gap-2 text-sm text-gray-700 mb-3">
                        <MapPin className="w-4 h-4 text-gray-700" />
                        {asset.location}
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="text-2xl font-bold text-black">
                          {asset.value}
                        </div>
                        <div className="flex items-center gap-1 text-sm text-gray-700">
                          <Users className="w-4 h-4 text-gray-700" />
                          {asset.investors}
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            <motion.div
              className="text-center mt-12"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 0.6 }}
            >
              <Link to="/dashboard/assets">
                <Button variant="outline" size="lg" className="group">
                  View All Assets
                  <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </motion.div>
          </div>
        </section>

        {/* African Communities Section */}
        <section id="communities" className="px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20 bg-gray-50 relative">
          {/* Section Separator */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-black/30 dark:via-white/30 to-transparent"></div>
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-black/30 dark:via-white/30 to-transparent"></div>
          
          {/* Text Readability Overlay */}
          <div className="absolute inset-0 dark:bg-black/20 light:bg-transparent pointer-events-none"></div>
          <div className="relative z-10 max-w-7xl mx-auto">
            <motion.div
              className="text-center mb-16"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <div className="inline-block mb-6">
                <div className="w-16 h-1 bg-gradient-to-r from-black to-black dark:from-white dark:to-white mx-auto mb-4"></div>
                <h2 className="text-4xl lg:text-6xl font-bold">
                  <span className="text-black dark:text-white">EMPOWERING</span>
                  <br />
                  <span className="text-black dark:text-white">AFRICAN COMMUNITIES</span>
                </h2>
              </div>
              <p className="text-xl text-off-white/70 max-w-3xl mx-auto dark:text-off-white/70 light:text-gray-800 dark:drop-shadow-lg">
                Real people, real stories. See how TrustBridge is transforming lives across Africa through asset tokenization.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                {
                  name: 'Grace Mwangi',
                  role: 'Coffee Farmer',
                  location: 'Mount Kenya, Kenya',
                  story: 'Tokenized my 50-acre coffee farm and now have 200+ global investors supporting my business.',
                  image: '/images/medium-shot-man-wearing-native-attire.jpg',
                  value: '$2.1M'
                },
                {
                  name: 'Ahmed Hassan',
                  role: 'Property Developer',
                  location: 'Lagos, Nigeria',
                  story: 'My commercial building in Victoria Island is now accessible to international investors.',
                  image: '/images/4trs.jpeg',
                  value: '$8.5M'
                },
                {
                  name: 'Thabo Mthembu',
                  role: 'Solar Engineer',
                  location: 'Cape Town, South Africa',
                  story: 'Our solar farm project now has global backing, bringing clean energy to 50,000 homes.',
                  image: '/images/pexels-fatima-yusuf-323522203-30541315.jpg',
                  value: '$15.2M'
                }
              ].map((person, index) => (
                <motion.div
                  key={person.name}
                  className="group"
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + index * 0.1, duration: 0.6 }}
                >
                  <div className="relative overflow-hidden rounded-xl bg-white border border-gray-200 hover:border-gray-300 transition-all duration-300 shadow-lg transform hover:-translate-y-1">
                    {/* Image */}
                    <div className="aspect-square relative overflow-hidden">
                      <img
                        src={person.image}
                        alt={person.name}
                        className="w-full h-full object-cover grayscale contrast-110 group-hover:scale-105 group-hover:grayscale-0 transition-all duration-300"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                      
                      {/* Value Badge */}
                      <div className="absolute top-3 right-3">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-black/20 dark:bg-white/20 text-black dark:text-white border border-black/30 dark:border-white/30">
                          {person.value}
                        </span>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-6">
                      <h3 className="text-xl font-bold text-off-white mb-1 dark:text-off-white light:text-gray-900">{person.name}</h3>
                      <p className="text-black dark:text-white font-medium mb-2">{person.role}</p>
                      <div className="flex items-center gap-2 text-sm text-medium-gray mb-4 dark:text-medium-gray light:text-gray-700">
                        <MapPin className="w-4 h-4" />
                        {person.location}
                      </div>
                      <p className="text-off-white/80 text-sm leading-relaxed italic dark:text-off-white/80 light:text-gray-800">
                        "{person.story}"
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20 bg-gray-50">
          <div className="max-w-7xl mx-auto">
            <motion.div
              className="text-center mb-16"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <h2 className="text-4xl lg:text-6xl font-bold mb-6">
                <span className="text-black dark:text-white">WHY</span>
                <span className="text-black dark:text-white"> TRUSTBRIDGE</span>
              </h2>
              <p className="text-xl text-off-white/70 max-w-3xl mx-auto dark:text-off-white/70 light:text-black/70">
                We're building the future of African finance through blockchain technology and professional verification.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {features.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <motion.div
                    key={feature.title}
                    className="text-center p-6 bg-white rounded-xl border border-gray-200 hover:border-gray-300 transition-all duration-300 hover:scale-105"
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 + index * 0.1, duration: 0.6 }}
                  >
                    <div className="w-16 h-16 bg-black/20 dark:bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Icon className="w-8 h-8 text-black dark:text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-off-white mb-3">{feature.title}</h3>
                    <p className="text-off-white/70">{feature.description}</p>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section id="how-it-works" className="px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
          <div className="max-w-7xl mx-auto">
            <motion.div
              className="text-center mb-16"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <h2 className="text-4xl lg:text-6xl font-bold mb-6">
                <span className="text-black dark:text-white">HOW IT</span>
                <span className="text-black dark:text-white"> WORKS</span>
              </h2>
              <p className="text-xl text-off-white/70 max-w-3xl mx-auto dark:text-off-white/70 light:text-black/70">
                From asset listing to global investment in four simple steps.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {steps.map((step, index) => (
                <motion.div
                  key={step.number}
                  className="text-center"
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + index * 0.1, duration: 0.6 }}
                >
                  <div className="relative mb-6">
                    <div className="w-20 h-20 bg-gradient-to-br from-black to-black dark:from-white dark:to-white rounded-full flex items-center justify-center mx-auto">
                      <span className="text-2xl font-bold text-white dark:text-black">{step.number}</span>
                    </div>
                    {index < steps.length - 1 && (
                      <div className="hidden lg:block absolute top-10 left-full w-full h-0.5 bg-gradient-to-r from-black to-black dark:from-white dark:to-white transform translate-x-4"></div>
                    )}
                  </div>
                  <h3 className="text-xl font-bold text-off-white mb-3">{step.title}</h3>
                  <p className="text-off-white/70">{step.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
          <div className="max-w-4xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <h2 className="text-4xl lg:text-6xl font-bold mb-6">
                <span className="text-black dark:text-white">READY TO</span>
                <br />
                <span className="text-black">LAUNCH APP</span>
              </h2>
              <p className="text-xl text-off-white/70 mb-12 dark:text-off-white/70 light:text-black/70">
                Join the future of African finance. Start investing or list your asset today.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link to="/dashboard">
                  <Button variant="primary" size="lg" className="group">
                    <Zap className="w-5 h-5 mr-2" />
                    Start Investing
                    <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
                <Button variant="outline" size="lg" className="group">
                  <Users className="w-5 h-5 mr-2" />
                  List Your Asset
                  <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Footer */}
        <footer className="px-4 sm:px-6 lg:px-8 py-8 sm:py-12 border-t border-black/20 dark:border-white/20">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
              <div className="flex flex-col">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 bg-black dark:bg-white triangle floating"></div>
                  <div>
                    <h3 className="text-lg font-bold text-black dark:text-white">TrustBridge</h3>
                    <p className="text-xs text-black dark:text-white uppercase tracking-wider">Africa</p>
                  </div>
                </div>
                <p className="text-sm text-off-white/70">
                  Tokenizing African assets on Mantle blockchain for global investment.
                </p>
              </div>

              <div className="flex flex-col">
                <h4 className="text-sm font-semibold text-black dark:text-white mb-4 uppercase tracking-wider">Resources</h4>
                <ul className="space-y-2">
                  <li>
                    <Link to="/documentation" className="text-sm text-off-white/70 hover:text-black dark:hover:text-white transition-colors">
                      Documentation
                    </Link>
                  </li>
                  <li>
                    <a href="https://hashscan.io/testnet" target="_blank" rel="noopener noreferrer" className="text-sm text-off-white/70 hover:text-black dark:hover:text-white transition-colors">
                      Block Explorer
                    </a>
                  </li>
                  <li>
                    <a href="https://mantle.xyz" target="_blank" rel="noopener noreferrer" className="text-sm text-off-white/70 hover:text-black dark:hover:text-white transition-colors">
                      About Mantle
                    </a>
                  </li>
                </ul>
              </div>

              <div className="flex flex-col">
                <h4 className="text-sm font-semibold text-black mb-4 uppercase tracking-wider">Launch App</h4>
                <ul className="space-y-2">
                  <li>
                    <Link to="/marketplace" className="text-sm text-off-white/70 hover:text-black dark:hover:text-white transition-colors">
                      Connect Wallet
                    </Link>
                  </li>
                  <li>
                    <Link to="/exchange" className="text-sm text-off-white/70 hover:text-black dark:hover:text-white transition-colors">
                      Get MNT
                    </Link>
                  </li>
                </ul>
              </div>
            </div>

            <div className="flex flex-col md:flex-row items-center justify-between pt-6 border-t border-black/20 dark:border-white/20">
              <span className="text-sm text-off-white/70 mb-2 md:mb-0">© 2026 TrustBridge Africa</span>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-black dark:bg-white rounded-full animate-pulse"></div>
                <span className="text-sm text-black dark:text-white">Live on Mantle</span>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default Landing;
