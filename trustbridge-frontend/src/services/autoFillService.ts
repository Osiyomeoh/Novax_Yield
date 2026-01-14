// Auto-fill Service for Testing
// This service provides realistic test data for the asset verification form

export interface AutoFillData {
  assetType: string;
  assetName: string;
  description: string;
  location: {
    address: string;
    city: string;
    state: string;
    country: string;
    coordinates: { lat: number; lng: number };
  };
  valuation: {
    estimatedValue: string;
    currency: string;
    valuationDate: string;
    valuator: string;
  };
  ownership: {
    ownerName: string;
    ownershipType: string;
    ownershipPercentage: string;
    idNumber: string;
    idType: string;
  };
  contact: {
    email: string;
    phone: string;
    alternatePhone: string;
  };
  verificationTier: string;
}

// Sample test data sets
const testDataSets = {
  farmProduce: {
    assetType: 'farm_produce',
    assetName: 'Premium Cocoa Farm - 50 Hectares',
    description: 'High-quality cocoa plantation with 5-year-old trees, organic farming practices, and excellent soil conditions. Located in fertile region with consistent rainfall.',
    location: {
      address: 'Km 15, Ibadan-Lagos Expressway',
      city: 'Ibadan',
      state: 'Oyo',
      country: 'Nigeria',
      coordinates: { lat: 7.3775, lng: 3.9470 }
    },
    valuation: {
      estimatedValue: '25000000',
      currency: 'NGN',
      valuationDate: '2024-01-15',
      valuator: 'AgriValuation Services Ltd'
    },
    ownership: {
      ownerName: 'Adebayo Ogunlesi',
      ownershipType: 'individual',
      ownershipPercentage: '100',
      idNumber: 'NG12345678901',
      idType: 'national_id'
    },
    contact: {
      email: 'adebayo.ogunlesi@email.com',
      phone: '+234-801-234-5678',
      alternatePhone: '+234-802-345-6789'
    },
    verificationTier: 'premium'
  },
  
  realEstate: {
    assetType: 'real_estate',
    assetName: 'Luxury Apartment Complex - Victoria Island',
    description: 'Modern 20-unit apartment complex in prime Victoria Island location. Features include swimming pool, gym, 24/7 security, and premium finishes.',
    location: {
      address: '123 Ahmadu Bello Way, Victoria Island',
      city: 'Lagos',
      state: 'Lagos',
      country: 'Nigeria',
      coordinates: { lat: 6.4281, lng: 3.4219 }
    },
    valuation: {
      estimatedValue: '500000000',
      currency: 'NGN',
      valuationDate: '2024-02-01',
      valuator: 'Lagos Property Valuers Ltd'
    },
    ownership: {
      ownerName: 'Chinwe Okonkwo',
      ownershipType: 'individual',
      ownershipPercentage: '100',
      idNumber: 'NG98765432109',
      idType: 'national_id'
    },
    contact: {
      email: 'chinwe.okonkwo@email.com',
      phone: '+234-803-456-7890',
      alternatePhone: '+234-804-567-8901'
    },
    verificationTier: 'premium'
  },

  farmland: {
    assetType: 'farmland',
    assetName: 'Rice Farm - 100 Hectares',
    description: 'Large-scale rice farming operation with modern irrigation system, storage facilities, and processing equipment. High-yield variety cultivation.',
    location: {
      address: 'Off Kano-Kaduna Road, Kano State',
      city: 'Kano',
      state: 'Kano',
      country: 'Nigeria',
      coordinates: { lat: 12.0022, lng: 8.5920 }
    },
    valuation: {
      estimatedValue: '150000000',
      currency: 'NGN',
      valuationDate: '2024-01-20',
      valuator: 'Northern Agriculture Valuers'
    },
    ownership: {
      ownerName: 'Hassan Ibrahim',
      ownershipType: 'individual',
      ownershipPercentage: '100',
      idNumber: 'NG45678912345',
      idType: 'national_id'
    },
    contact: {
      email: 'hassan.ibrahim@email.com',
      phone: '+234-805-678-9012',
      alternatePhone: '+234-806-789-0123'
    },
    verificationTier: 'standard'
  },

  vehicle: {
    assetType: 'vehicle',
    assetName: 'Mercedes-Benz Actros Truck - 2023',
    description: 'Heavy-duty commercial truck in excellent condition, used for logistics and transportation. Low mileage, well-maintained with full service history.',
    location: {
      address: 'Lagos Port Complex, Apapa',
      city: 'Lagos',
      state: 'Lagos',
      country: 'Nigeria',
      coordinates: { lat: 6.4412, lng: 3.4058 }
    },
    valuation: {
      estimatedValue: '45000000',
      currency: 'NGN',
      valuationDate: '2024-01-10',
      valuator: 'AutoValuation Experts Ltd'
    },
    ownership: {
      ownerName: 'Femi Adebayo',
      ownershipType: 'individual',
      ownershipPercentage: '100',
      idNumber: 'NG78912345678',
      idType: 'national_id'
    },
    contact: {
      email: 'femi.adebayo@email.com',
      phone: '+234-807-890-1234',
      alternatePhone: '+234-808-901-2345'
    },
    verificationTier: 'basic'
  }
};

export class AutoFillService {
  private static instance: AutoFillService;
  
  static getInstance(): AutoFillService {
    if (!AutoFillService.instance) {
      AutoFillService.instance = new AutoFillService();
    }
    return AutoFillService.instance;
  }

  // Get all available test data sets
  getAvailableDataSets(): string[] {
    return Object.keys(testDataSets);
  }

  // Get test data by type
  getTestData(type: keyof typeof testDataSets): AutoFillData {
    return testDataSets[type];
  }

  // Get random test data
  getRandomTestData(): AutoFillData {
    const types = Object.keys(testDataSets) as Array<keyof typeof testDataSets>;
    const randomType = types[Math.floor(Math.random() * types.length)];
    return testDataSets[randomType];
  }


  // Auto-fill form data
  autoFillForm(setType: keyof typeof testDataSets = 'farmProduce'): AutoFillData {
    return this.getTestData(setType);
  }
}

export default AutoFillService;
