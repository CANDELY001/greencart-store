import React from "react";
import MainBanner from "../components/MainBanner";
import Categories from "../components/Categories";
import BestSeller from "../components/BestSeller";
import FeaturesBanner from "../components/FeaturesBanner";

function Home() {
  return (
    <div className="mt-10">
      <MainBanner />
      <Categories />
      <BestSeller />
      <FeaturesBanner />
    </div>
  );
}

export default Home;
