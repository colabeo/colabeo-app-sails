# Development Setup
git clone git@github.com:colabeo/colabeo-app-sails.git

git clone git@github.com:colabeo/colabeo-client.git

cd colabeo-app-sails

sudo npm install

cd assets

ln -s ../../colabeo-client famous-time

cd ../../colabeo-client

bower install


# colabeo-app-sails
### a Sails application

How to add a git submodule

git submodule add git@github.com:colabeo/colabeo-client.git assets/famous-time

How to remove a git submodule

git submodule deinit -f assets/famous-time

git rm -f assets/famous-time

==============================================================================

How to start

sudo npm install

git submodule init

git submodule update --init

cd assets/famous-time

bower install


