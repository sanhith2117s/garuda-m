import adminLogo from '../assets/admin.png';
import adminLogoDark from '../assets/admin_dark.png';
import kmecLogo from '../assets/kmec.png';
import kmecLogoDark from '../assets/kmec_dark.png';
import ngitLogo from '../assets/ngit.png';
import ngitLogoDark from '../assets/ngit_dark.png';

export interface CollegeAssetInfo {
  code: string;
  name: string;
  lightLogo: string;
  darkLogo: string;
  bgLogo: string;
  brandColor: string;
  subTitle: string;
}

export function getCollegeAssets(collegeCode?: string | null, role?: string | null): CollegeAssetInfo {
  const code = (collegeCode || '').toUpperCase();

  if (code.includes('NGIT')) {
    return {
      code: 'NGIT',
      name: 'Neil Gogte Institute of Technology',
      lightLogo: ngitLogo,
      darkLogo: ngitLogoDark,
      bgLogo: ngitLogo,
      brandColor: 'emerald',
      subTitle: 'NGIT Gate Pass System'
    };
  }

  if (code.includes('KMEC')) {
    return {
      code: 'KMEC',
      name: 'Keshav Memorial Engineering College',
      lightLogo: kmecLogo,
      darkLogo: kmecLogoDark,
      bgLogo: kmecLogo,
      brandColor: 'indigo',
      subTitle: 'KMEC Gate Pass System'
    };
  }

  // Default KMIT / Super Admin
  return {
    code: 'KMIT',
    name: 'Keshav Memorial Institute of Technology',
    lightLogo: adminLogo,
    darkLogo: adminLogoDark,
    bgLogo: adminLogo,
    brandColor: 'orange',
    subTitle: 'GARUDA Multi-College Management System'
  };
}
