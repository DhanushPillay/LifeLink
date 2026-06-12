export const mockDonors = [
  {
    id: 'd1',
    bloodGroup: 'O+',
    age: 28,
    gender: 'Male',
    weight: '72 kg',
    smoker: false,
    alcoholic: false,
    illnesses: 'None',
    lastDonation: '2025-08-15',
    donateBlood: true,
    donateOrgan: false,
    organs: [],
    lat: 28.6139,
    lng: 77.209,
    city: 'New Delhi',
    available: true,
  },
  {
    id: 'd2',
    bloodGroup: 'A+',
    age: 34,
    gender: 'Female',
    weight: '58 kg',
    smoker: false,
    alcoholic: false,
    illnesses: 'None',
    lastDonation: '2025-11-20',
    donateBlood: true,
    donateOrgan: true,
    organs: ['Kidney', 'Liver'],
    lat: 28.5355,
    lng: 77.391,
    city: 'Noida',
    available: true,
  },
  {
    id: 'd3',
    bloodGroup: 'B-',
    age: 22,
    gender: 'Male',
    weight: '65 kg',
    smoker: false,
    alcoholic: false,
    illnesses: 'None',
    lastDonation: '2026-01-10',
    donateBlood: true,
    donateOrgan: false,
    organs: [],
    lat: 28.7041,
    lng: 77.1025,
    city: 'Delhi',
    available: true,
  },
  {
    id: 'd4',
    bloodGroup: 'AB+',
    age: 41,
    gender: 'Female',
    weight: '62 kg',
    smoker: false,
    alcoholic: true,
    illnesses: 'Controlled hypertension',
    lastDonation: '2025-06-05',
    donateBlood: true,
    donateOrgan: true,
    organs: ['Kidney', 'Cornea'],
    lat: 19.076,
    lng: 72.8777,
    city: 'Mumbai',
    available: true,
  },
  {
    id: 'd5',
    bloodGroup: 'O-',
    age: 30,
    gender: 'Male',
    weight: '78 kg',
    smoker: false,
    alcoholic: false,
    illnesses: 'None',
    lastDonation: '2025-12-01',
    donateBlood: true,
    donateOrgan: true,
    organs: ['Liver', 'Bone Marrow'],
    lat: 19.2183,
    lng: 72.9781,
    city: 'Thane',
    available: true,
  },
  {
    id: 'd6',
    bloodGroup: 'A-',
    age: 26,
    gender: 'Female',
    weight: '55 kg',
    smoker: false,
    alcoholic: false,
    illnesses: 'None',
    lastDonation: '2026-02-14',
    donateBlood: true,
    donateOrgan: false,
    organs: [],
    lat: 12.9716,
    lng: 77.5946,
    city: 'Bangalore',
    available: true,
  },
  {
    id: 'd7',
    bloodGroup: 'B+',
    age: 35,
    gender: 'Male',
    weight: '80 kg',
    smoker: true,
    alcoholic: false,
    illnesses: 'None',
    lastDonation: '2025-09-22',
    donateBlood: true,
    donateOrgan: true,
    organs: ['Kidney'],
    lat: 12.9352,
    lng: 77.6245,
    city: 'Bangalore',
    available: false,
  },
  {
    id: 'd8',
    bloodGroup: 'O+',
    age: 29,
    gender: 'Female',
    weight: '60 kg',
    smoker: false,
    alcoholic: false,
    illnesses: 'None',
    lastDonation: '2025-10-30',
    donateBlood: true,
    donateOrgan: true,
    organs: ['Heart', 'Lungs'],
    lat: 13.0827,
    lng: 80.2707,
    city: 'Chennai',
    available: true,
  },
  {
    id: 'd9',
    bloodGroup: 'AB-',
    age: 38,
    gender: 'Male',
    weight: '74 kg',
    smoker: false,
    alcoholic: false,
    illnesses: 'None',
    lastDonation: '2025-07-18',
    donateBlood: true,
    donateOrgan: false,
    organs: [],
    lat: 22.5726,
    lng: 88.3639,
    city: 'Kolkata',
    available: true,
  },
  {
    id: 'd10',
    bloodGroup: 'A+',
    age: 24,
    gender: 'Female',
    weight: '52 kg',
    smoker: false,
    alcoholic: false,
    illnesses: 'None',
    lastDonation: '2026-03-01',
    donateBlood: true,
    donateOrgan: true,
    organs: ['Pancreas', 'Cornea'],
    lat: 17.385,
    lng: 78.4867,
    city: 'Hyderabad',
    available: true,
  },
];

export function searchDonors({ type, query, lat, lng }) {
  let results = [...mockDonors];

  if (type === 'blood') {
    results = results.filter((d) => d.donateBlood && d.available);
    if (query) {
      results = results.filter(
        (d) => d.bloodGroup.toLowerCase() === query.toLowerCase()
      );
    }
  } else if (type === 'organ') {
    results = results.filter((d) => d.donateOrgan && d.available);
    if (query) {
      results = results.filter((d) =>
        d.organs.some((o) => o.toLowerCase().includes(query.toLowerCase()))
      );
    }
  }

  if (lat && lng) {
    results = results
      .map((d) => ({
        ...d,
        distance: haversine(d.lat, d.lng, lat, lng),
      }))
      .sort((a, b) => a.distance - b.distance);
  }

  return results;
}

function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
