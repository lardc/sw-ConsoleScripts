function SC(CurrentValue)
{

    dev.nid(1);
	
	//����� �������
	print("Battery charge start.");
    while(dev.r(66)!=103){sleep(100);}
	print("Battery charged.");

	
	//������ �������� �������� ����
	print("Config start.");
	dev.w(64, CurrentValue);
	sleep(100);
	dev.c(2);
	sleep(100);
	while(dev.r(66)!=105){sleep(100);}
	print("Config ready.");
	
	//������������ �������� ����
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
		//����� �������
		print("Battery charge start.");
		while(dev.r(66)!=103){sleep(100);}
		print("Battery charged.");

		
		//������ �������� �������� ����
		print("Config start.");
		dev.w(64, CurrentValue);
		sleep(100);
		dev.c(2);
		sleep(100);
		while(dev.r(66)!=105){sleep(100);}
		print("Config ready.");
		
		//������������ �������� ����
		print("Surge current start.");
		dev.c(3);
		sleep(100);
		while(dev.r(66)!=107){sleep(100);}
		print("Surge current completed.");
		print("---------");
		
		PulsePumber--;
	}
}