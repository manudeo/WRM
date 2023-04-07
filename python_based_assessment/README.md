# Python-based spatial data assessment
Manudeo Singh, University of Potsdam  
(manudeo.singh@uni-potsdam.de)

## Requirements:

1. Activate WSL2 in windows: 
         Follow this link (recommended) - https://ubuntu.com/tutorials/install-ubuntu-on-wsl2-on-windows-10#1-overview

    OR - https://learn.microsoft.com/en-us/windows/wsl/install 


    NOTE: Use Ubuntu 20.08 version


2. Install minconda in WSL2's Ubuntu :
    In Ubuntu Shell, type: 
        a. cd
        b. wget https://repo.anaconda.com/miniconda/Miniconda3-latest-Linux-x86_64.sh
        c. chmod +x Miniconda3-latest-Linux-x86_64.sh
        d. ./Miniconda3-latest-Linux-x86_64.sh
        
        Accept licence etc. and choose yes if prompted to change shell to conda shell (at the end of the installation)
        
3. Make a conda environment with required packages:
    Step 1: cd
    Step 2: wget https://raw.githubusercontent.com/manudeo/Spatial_data_assessment/main/python_based_assessment/environment.yml
    Step 3: source miniconda3/bin/activate
    Step 4: conda env create -f environment.yml
    Step 4: conda activate xarray
    
4. Go to your working directory: e.g. if in D drive, cd /mnt/d
