# Start Generation Here
echo "#!/bin/bash" > update_script.sh
echo "git add ." >> update_script.sh
echo "git commit -m \"update\"" >> update_script.sh
echo "git push origin main" >> update_script.sh
chmod +x update_script.sh
./update_script.sh  # Execute the script to run the git commands
# End Generation Here
