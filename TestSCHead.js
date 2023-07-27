function SC(CurrentValue)
{

    dev.nid(1);
	
	//Заряд батареи
	print("Battery charge start.");
    while(dev.r(66)!=103){sleep(100);}
	print("Battery charged.");

	
	//Запись значения ударного тока
	print("Config start.");
	dev.w(64, CurrentValue);
	sleep(100);
	dev.c(2);
	sleep(100);
	while(dev.r(66)!=105){sleep(100);}
	print("Config ready.");
	
	//Формирование ударного тока
	print("Surge current start.");
	dev.c(3);
	sleep(100);
	while(dev.r(66)!=107){sleep(100);}
	print("Surge current completed.");
	
	
}

function SCSerial(CurrentValue, PulsePumber)
{

    dev.nid(1);
	
	while(PulsePumber>0)
	{
		print("=====================================================");
		print("PulseCount="+PulsePumber);
		print("---------");
		//Заряд батареи
		print("Battery charge start.");
		while(dev.r(66)!=103){sleep(100);}
		print("Battery charged.");

		
		//Запись значения ударного тока
		print("Config start.");
		dev.w(64, CurrentValue);
		sleep(100);
		dev.c(2);
		sleep(100);
		while(dev.r(66)!=105){sleep(100);}
		print("Config ready.");
		
		//Формирование ударного тока
		print("Surge current start.");
		dev.c(3);
		sleep(100);
		while(dev.r(66)!=107){sleep(100);}
		print("Surge current completed.");
		print("---------");
		
		PulsePumber--;
	}
}