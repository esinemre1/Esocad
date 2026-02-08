import React, { useEffect } from 'react';
import { AdMob, BannerAdSize, BannerAdPosition, BannerAdPluginEvents } from '@capacitor-community/admob';

const AdBanner: React.FC = () => {
    useEffect(() => {
        // Initialize AdMob
        AdMob.initialize().then(async () => {
            // Show Banner
            await AdMob.showBanner({
                adId: 'ca-app-pub-8316219134290346/1196123322',
                adSize: BannerAdSize.BANNER,
                position: BannerAdPosition.BOTTOM_CENTER,
                margin: 0,
            });
        }).catch(err => console.error('AdMob init failed', err));

        // Cleanup on unmount (optional, but good practice if the component unmounts)
        return () => {
            AdMob.hideBanner().catch(err => console.error('Hide banner failed', err));
        };
    }, []);

    // This component doesn't render any visible DOM elements itself
    // The banner is rendered natively over the WebView
    return null;
};

export default AdBanner;
